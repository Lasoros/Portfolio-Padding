// static/app.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    const searchInput = document.getElementById('item-search');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    
    // Initialize settings elements
    const facilitySelect = document.getElementById('facility');
    const meInput = document.getElementById('me');
    const teInput = document.getElementById('te');
    const runsInput = document.getElementById('runs');
    const taxInput = document.getElementById('tax');
    const marketSelect = document.getElementById('market');
    
    // Check API status on load
    checkAPIStatus();
    
    // Event listeners
    searchButton.addEventListener('click', searchItems);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchItems();
        }
    });
    
    // Add event listeners for settings changes
    [facilitySelect, meInput, teInput, runsInput, taxInput, marketSelect].forEach(element => {
        element.addEventListener('change', recalculateIfBlueprintSelected);
    });
    
    // Current blueprint tracker
    let currentBlueprintId = null;
    
    function checkAPIStatus() {
        fetch('/api/status')
            .then(response => response.json())
            .then(data => {
                const statusElement = document.getElementById('api-status');
                if (data.status === 'online') {
                    statusElement.textContent = `API Status: Online (${data.players} players)`;
                } else {
                    statusElement.textContent = `API Status: ${data.message || 'Error'}`;
                }
            })
            .catch(error => {
                document.getElementById('api-status').textContent = 'API Status: Error connecting to server';
            });
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        loadingElement.style.display = 'none';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    function formatISK(isk) {
        return new Intl.NumberFormat('en-US').format(Math.round(isk * 100) / 100) + " ISK";
    }
    
    function searchItems() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length < 3) {
            showError('Please enter at least 3 characters to search');
            return;
        }
        
        // Show loading, hide results
        loadingElement.style.display = 'block';
        searchResults.style.display = 'none';
        
        fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Error searching for items');
                    });
                }
                return response.json();
            })
            .then(data => {
                displaySearchResults(data.results);
            })
            .catch(error => {
                showError(error.message);
            })
            .finally(() => {
                loadingElement.style.display = 'none';
            });
    }
    
    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        
        if (results && results.length > 0) {
            results.forEach(item => {
                const div = document.createElement('div');
                div.textContent = item.name;
                div.addEventListener('click', () => selectBlueprint(item.id));
                searchResults.appendChild(div);
            });
        } else {
            const div = document.createElement('div');
            div.textContent = 'No results found';
            searchResults.appendChild(div);
        }
        
        searchResults.style.display = 'block';
    }
    
    function selectBlueprint(blueprintId) {
        // Hide search results, show loading
        searchResults.style.display = 'none';
        loadingElement }