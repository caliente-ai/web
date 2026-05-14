// Custom point-in-polygon — ray casting. `pts` is a flat [x0,y0,x1,y1,...]
// array in image-pixel coordinates (the space polygons are defined in).
//
// This is the §2.2 mitigation: when Konva's hit-graph is disabled
// (`listening:false`), hover/click hit-testing runs through here instead of
// Konva's hidden hit canvas. Vertex count drives the cost, so the spike's
// polygons intentionally vary 4–12 vertices.
export function pointInPolygon(x, y, pts) {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const xi = pts[i];
    const yi = pts[i + 1];
    const xj = pts[j];
    const yj = pts[j + 1];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
