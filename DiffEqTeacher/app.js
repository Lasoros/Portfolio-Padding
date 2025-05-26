function drawSlopeField() {
  const equationInput = document.getElementById("equation").value;
  const canvas = document.getElementById("slopeCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const gridSize = 20;
  const scale = 20;

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;

  for (let i = 0; i < width; i += gridSize) {
    for (let j = 0; j < height; j += gridSize) {
      const x = (i - width / 2) / scale;
      const y = (height / 2 - j) / scale;

      let slope = 0;
      try {
        // Evaluate dy/dx = f(x, y)
        slope = eval(equationInput);
      } catch (err) {
        alert("Invalid equation format!");
        return;
      }

      const angle = Math.atan(slope);
      const dx = Math.cos(angle) * 8;
      const dy = Math.sin(angle) * 8;

      ctx.beginPath();
      ctx.moveTo(i - dx, j + dy);
      ctx.lineTo(i + dx, j - dy);
      ctx.stroke();
    }
  }
}
