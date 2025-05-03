const regionId = 10000002; // The Forge, Jita market

async function getMarketPrice(typeId) {
  const url = `https://esi.evetech.net/latest/markets/${regionId}/orders/?type_id=${typeId}`;
  const res = await fetch(url);
  const data = await res.json();

  // Filter sell orders only
  const sellOrders = data.filter(order => order.is_buy_order === false);
  sellOrders.sort((a, b) => a.price - b.price);

  return sellOrders.length > 0 ? sellOrders[0].price : 0;
}

async function calculateProfit() {
  const typeId = document.getElementById("typeId").value;
  const output = document.getElementById("output");

  if (!typeId) {
    output.innerHTML = "Please enter a valid Type ID.";
    return;
  }

  output.innerHTML = "Fetching prices...";

  try {
    const sellPrice = await getMarketPrice(typeId);

    // Fake material costs for demonstration (replace with actual blueprint data)
    const materials = [
      { typeId: 34, quantity: 100 }, // Tritanium
      { typeId: 35, quantity: 50 },  // Pyerite
    ];

    let totalMaterialCost = 0;
    for (const mat of materials) {
      const price = await getMarketPrice(mat.typeId);
      totalMaterialCost += price * mat.quantity;
    }

    const profit = sellPrice - totalMaterialCost;

    output.innerHTML = `
      <p>Sell Price: ${sellPrice.toFixed(2)} ISK</p>
      <p>Total Material Cost: ${totalMaterialCost.toFixed(2)} ISK</p>
      <p><strong>Profit: ${profit.toFixed(2)} ISK</strong></p>
    `;
  } catch (err) {
    output.innerHTML = "Error fetching data: " + err.message;
  }
}
