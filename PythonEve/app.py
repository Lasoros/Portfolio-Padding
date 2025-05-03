# app.py
from flask import Flask, render_template, request, jsonify
import requests
import json
from datetime import datetime, timedelta
import math
import os
from werkzeug.contrib.cache import SimpleCache

app = Flask(__name__)
cache = SimpleCache()

# Constants for EVE ESI API
ESI_BASE = 'https://esi.evetech.net'
ESI_SEARCH = '/v2/search/'
ESI_UNIVERSE_TYPES = '/v3/universe/types/'
ESI_MARKETS_PRICES = '/v1/markets/prices/'
ESI_UNIVERSE_NAMES = '/v3/universe/names/'

# EVE Marketer API for regional market data
EVE_MARKETER_BASE = 'https://api.evemarketer.com/ec/marketstat/json'

# Cache timeouts (in seconds)
CACHE_TIMEOUTS = {
    'search': 3600,  # 1 hour
    'item_details': 86400,  # 24 hours
    'market_prices': 900,  # 15 minutes
    'names': 86400,  # 24 hours
    'status': 300  # 5 minutes
}

# Facility manufacturing bonuses
FACILITY_BONUSES = {
    'station': 0,
    'engineering_complex': 0.01,  # 1% material reduction
    'sotiyo': 0.015  # 1.5% material reduction
}

# Market hubs with region IDs
MARKET_HUBS = {
    '10000002': 'Jita (The Forge)',
    '10000043': 'Amarr (Domain)',
    '10000032': 'Dodixie (Sinq Laison)',
    '10000042': 'Hek (Metropolis)',
    '10000030': 'Rens (Heimatar)'
}

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html', market_hubs=MARKET_HUBS)

@app.route('/api/status')
def api_status():
    """Check ESI API status"""
    status = cache.get('api_status')
    if status is not None:
        return jsonify(status)
    
    try:
        response = requests.get(f"{ESI_BASE}/v1/status/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            status = {
                'status': 'online',
                'players': data.get('players', 0),
                'server_version': data.get('server_version', 'unknown'),
                'timestamp': datetime.now().isoformat()
            }
        else:
            status = {'status': 'error', 'message': f"ESI API returned status {response.status_code}"}
    except Exception as e:
        status = {'status': 'error', 'message': str(e)}
    
    cache.set('api_status', status, timeout=CACHE_TIMEOUTS['status'])
    return jsonify(status)

@app.route('/api/search')
def search_items():
    """Search for items/blueprints by name"""
    search_term = request.args.get('q', '').strip()
    if len(search_term) < 3:
        return jsonify({'error': 'Please enter at least 3 characters to search'}), 400
    
    # Check cache
    cache_key = f"search_{search_term}"
    results = cache.get(cache_key)
    if results is not None:
        return jsonify(results)
    
    try:
        # ESI search call
        search_params = {
            'categories': 'inventory_type',
            'datasource': 'tranquility',
            'language': 'en-us',
            'search': search_term,
            'strict': 'false'
        }
        
        response = requests.get(f"{ESI_BASE}{ESI_SEARCH}", params=search_params, timeout=10)
        
        if response.status_code != 200:
            return jsonify({'error': f"ESI API error: {response.status_code}"}), 500
        
        data = response.json()
        
        if not data.get('inventory_type'):
            return jsonify({'results': []})
        
        # Get names for the type IDs (first 50 to stay within ESI limits)
        type_ids = data['inventory_type'][:50]
        names_data = get_item_names(type_ids)
        
        # Filter for blueprints
        blueprints = [
            {'id': item['id'], 'name': item['name']} 
            for item in names_data 
            if 'blueprint' in item['name'].lower() or 'bpc' in item['name'].lower() or 'bpo' in item['name'].lower()
        ]
        
        results = {'results': blueprints}
        cache.set(cache_key, results, timeout=CACHE_TIMEOUTS['search'])
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': f"Error searching for items: {str(e)}"}), 500

@app.route('/api/blueprint/<int:blueprint_id>')
def get_blueprint_details(blueprint_id):
    """Get detailed information about a blueprint and its manufacturing requirements"""
    try:
        # Get manufacturing settings from request
        me = int(request.args.get('me', 0))
        te = int(request.args.get('te', 0))
        runs = int(request.args.get('runs', 1))
        facility = request.args.get('facility', 'engineering_complex')
        tax_rate = float(request.args.get('tax', 2.5)) / 100
        region_id = request.args.get('region', '10000002')  # Default to Jita
        
        # Get blueprint details
        blueprint = get_item_details(blueprint_id)
        
        # Check if blueprint has manufacturing activity
        if not blueprint.get('activities') or not blueprint['activities'].get('manufacturing'):
            return jsonify({'error': 'This item is not a blueprint with manufacturing activity'}), 400
        
        # Get product type ID
        if not blueprint['activities']['manufacturing'].get('products') or not blueprint['activities']['manufacturing']['products']:
            return jsonify({'error': 'Blueprint does not produce any products'}), 400
            
        product_type_id = blueprint['activities']['manufacturing']['products'][0]['type_id']
        
        # Get product details
        product = get_item_details(product_type_id)
        
        # Get materials
        materials = blueprint['activities']['manufacturing']['materials']
        material_type_ids = [mat['type_id'] for mat in materials]
        
        # Add product ID for pricing
        all_type_ids = material_type_ids + [product_type_id]
        
        # Get market prices for all items
        prices = get_market_prices(all_type_ids, region_id)
        
        # Get names for all material items
        material_names = get_item_names([mat['type_id'] for mat in materials])
        material_names_dict = {item['id']: item['name'] for item in material_names}
        
        # Calculate ME bonus and facility bonus
        facility_bonus = FACILITY_BONUSES.get(facility, 0)
        me_multiplier = (100 - me) / 100
        total_material_multiplier = me_multiplier * (1 - facility_bonus)
        
        # Process materials with adjusted quantities
        processed_materials = []
        total_material_cost = 0
        
        for mat in materials:
            mat_type_id = mat['type_id']
            mat_name = material_names_dict.get(mat_type_id, f"Material #{mat_type_id}")
            adjusted_quantity = math.ceil(mat['quantity'] * total_material_multiplier) * runs
            
            # Get price (prioritize sell orders for buying materials)
            price = 0
            if mat_type_id in prices:
                price = prices[mat_type_id].get('sell', prices[mat_type_id].get('buy', 0))
            
            total_cost = adjusted_quantity * price
            total_material_cost += total_cost
            
            processed_materials.append({
                'type_id': mat_type_id,
                'name': mat_name,
                'quantity': adjusted_quantity,
                'price': price,
                'total_cost': total_cost
            })
        
        # Calculate manufacturing tax
        tax_cost = total_material_cost * tax_rate
        
        # Calculate installation fee (simplified)
        production_time = blueprint['activities']['manufacturing']['time']
        install_fee = production_time / 3600 * 1000  # Approx 1000 ISK per hour
        
        # Total manufacturing cost
        total_cost = total_material_cost + tax_cost + install_fee
        
        # Calculate profits
        product_price = 0
        if product_type_id in prices:
            product_price = prices[product_type_id].get('sell', prices[product_type_id].get('buy', 0))
        
        total_value = product_price * runs
        unit_cost = total_cost / runs
        unit_profit = product_price - unit_cost
        total_profit = unit_profit * runs
        profit_margin = (unit_profit / unit_cost) * 100 if unit_cost > 0 else 0
        
        # Format time in human-readable format
        hours = math.floor(production_time / 3600)
        minutes = math.floor((production_time % 3600) / 60)
        formatted_time = f"{hours} hours, {minutes} minutes" if hours > 0 else f"{minutes} minutes"
        
        result = {
            'blueprint': {
                'id': blueprint_id,
                'name': blueprint.get('name', f"Blueprint #{blueprint_id}"),
                'production_time': production_time,
                'formatted_time': formatted_time
            },
            'product': {
                'id': product_type_id,
                'name': product.get('name', f"Product #{product_type_id}"),
                'price': product_price
            },
            'materials': processed_materials,
            'costs': {
                'material_cost': total_material_cost,
                'tax_cost': tax_cost,
                'install_fee': install_fee,
                'total_cost': total_cost
            },
            'profit': {
                'unit_price': product_price,
                'total_value': total_value,
                'unit_cost': unit_cost,
                'unit_profit': unit_profit,
                'total_profit': total_profit,
                'profit_margin': profit_margin
            },
            'settings': {
                'me': me,
                'te': te,
                'runs': runs,
                'facility': facility,
                'tax_rate': tax_rate * 100,
                'region_id': region_id
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': f"Error processing blueprint: {str(e)}"}), 500

def get_item_details(type_id):
    """Get item type details from ESI, with caching"""
    cache_key = f"item_{type_id}"
    item_data = cache.get(cache_key)
    if item_data is not None:
        return item_data
    
    response = requests.get(
        f"{ESI_BASE}{ESI_UNIVERSE_TYPES}{type_id}/",
        params={'datasource': 'tranquility', 'language': 'en-us'},
        timeout=10
    )
    
    if response.status_code != 200:
        raise Exception(f"ESI API error: {response.status_code}")
    
    item_data = response.json()
    cache.set(cache_key, item_data, timeout=CACHE_TIMEOUTS['item_details'])
    return item_data

def get_market_prices(type_ids, region_id='10000002'):
    """Get market prices from EVE Marketer API with fallback to ESI"""
    if not type_ids:
        return {}
    
    # Create a cache key using region and sorted type IDs
    cache_key = f"market_prices_{region_id}_{'-'.join(map(str, sorted(type_ids)))}"
    prices_data = cache.get(cache_key)
    if prices_data is not None:
        return prices_data
    
    prices = {}
    
    try:
        # Use EVE Marketer for regional prices
        type_param = '&typeid='.join(map(str, type_ids))
        url = f"{EVE_MARKETER_BASE}?regionlimit={region_id}&typeid={type_param}"
        
        response = requests.get(url, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            for item in data:
                type_id = item['buy']['forQuery']['types'][0]
                prices[type_id] = {
                    'buy': item['buy']['max'],
                    'sell': item['sell']['min'] if item['sell']['min'] > 0 else item['buy']['max']
                }
                
            cache.set(cache_key, prices, timeout=CACHE_TIMEOUTS['market_prices'])
            return prices
    except Exception as e:
        print(f"EVE Marketer API error, falling back to ESI: {str(e)}")
    
    # Fallback to ESI prices
    try:
        esi_cache_key = "market_prices_esi"
        esi_prices = cache.get(esi_cache_key)
        
        if esi_prices is None:
            response = requests.get(
                f"{ESI_BASE}{ESI_MARKETS_PRICES}",
                params={'datasource': 'tranquility'},
                timeout=15
            )
            
            if response.status_code != 200:
                raise Exception(f"ESI API error: {response.status_code}")
            
            data = response.json()
            
            esi_prices = {}
            for item in data:
                type_id = item['type_id']
                esi_prices[type_id] = {
                    'buy': item.get('average_price', 0) or 0,
                    'sell': item.get('adjusted_price', 0) or 0
                }
            
            cache.set(esi_cache_key, esi_prices, timeout=CACHE_TIMEOUTS['market_prices'])
        
        # Filter to just the type IDs we need
        result = {type_id: esi_prices[type_id] for type_id in type_ids if type_id in esi_prices}
        return result
        
    except Exception as e:
        print(f"ESI price API error: {str(e)}")
        return {}

def get_item_names(type_ids):
    """Get names for multiple item types, with caching"""
    if not type_ids:
        return []
    
    # Check cache first, build list of uncached IDs
    result = []
    uncached_ids = []
    
    for type_id in type_ids:
        cache_key = f"name_{type_id}"
        cached_name = cache.get(cache_key)
        
        if cached_name is not None:
            result.append({'id': type_id, 'name': cached_name})
        else:
            uncached_ids.append(type_id)
    
    if not uncached_ids:
        return result
    
    # Process uncached IDs in batches of 100 (ESI limit)
    for i in range(0, len(uncached_ids), 100):
        batch = uncached_ids[i:i+100]
        
        try:
            response = requests.post(
                f"{ESI_BASE}{ESI_UNIVERSE_NAMES}",
                json=batch,
                headers={'Content-Type': 'application/json'},
                params={'datasource': 'tranquility'},
                timeout=10
            )
            
            if response.status_code != 200:
                # On error, just use type IDs as names
                for type_id in batch:
                    result.append({'id': type_id, 'name': f"Item #{type_id}"})
                continue
            
            data = response.json()
            
            for item in data:
                # Cache individual names
                cache_key = f"name_{item['id']}"
                cache.set(cache_key, item['name'], timeout=CACHE_TIMEOUTS['names'])
                
                result.append({'id': item['id'], 'name': item['name']})
                
        except Exception as e:
            print(f"Error fetching item names: {str(e)}")
            # On error, just use type IDs as names
            for type_id in batch:
                result.append({'id': type_id, 'name': f"Item #{type_id}"})
    
    return result

if __name__ == '__main__':
    app.run(debug=True)