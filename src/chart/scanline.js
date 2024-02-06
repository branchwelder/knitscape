import { toChartCoords } from "./helpers";
import { stitches } from "../constants";

function addEdge(edgeTable, [x1, y1], [x2, y2], f) {
  if (y1 > y2) {
    [x1, x2] = [x2, x1];
    [y1, y2] = [y2, y1];
  }

  if (y1 === y2) return; // Skip horizontal edges
  edgeTable.push({
    x: x1,
    y: y1,
    yMax: y2,
    slope: (x2 - x1) / (y2 - y1),
    xLast: x1,
    f,
  });
}

export function scanlineFill(bbox, shape, chart) {
  const points = shape.map((pt) => toChartCoords(pt, bbox, chart));
  let edges = [];

  for (let i = 0; i < points.length; i++) {
    addEdge(edges, points[i], points[(i + 1) % points.length], shape[i][2]);
  }
  edges.sort((a, b) => a.y - b.y); // sort edges by their min y

  let activeEdges = [];
  let y = 0;

  while (edges.length > 0 || activeEdges.length > 0) {
    while (edges.length > 0) {
      if (edges[0].y == y) {
        // add edges that start on this row
        activeEdges.push(edges.shift());
      } else {
        break;
      }
    }
    // console.log(`decreasing ${diffLeft} stitch on left`);

    activeEdges.sort((a, b) => a.x - b.x); // sort edges by x

    for (let i = 0; i < activeEdges.length; i = i + 2) {
      // fill in between ascending pairs
      let left = activeEdges[i];
      let right = activeEdges[i + 1];

      let xLeft = Math.round(activeEdges[i].x);
      let xRight = Math.round(activeEdges[i + 1].x);

      chart = chart.line(
        { x: Math.round(activeEdges[i].x), y },
        { x: Math.round(activeEdges[i + 1].x), y },
        stitches.KNIT
      );

      let diffLeft = xLeft - left.xLast;
      let diffRight = xRight - right.xLast;

      if (Math.abs(left.slope) < 1 && left.f > 0) {
        if (diffLeft === 1) {
          chart = chart.line(
            { x: left.xLast, y: y - 1 },
            { x: left.xLast + left.f - 1, y: y - 1 },
            stitches.FXR1
          );
        } else if (diffLeft === -1) {
          chart = chart.line(
            { x: left.xLast, y: y - 1 },
            {
              x: left.xLast + left.f - 1,
              y: y - 1,
            },
            stitches.FXL1
          );
        }
      }
      if (Math.abs(right.slope) < 1 && right.f > 0) {
        if (diffRight === -1) {
          // console.log(`dec ${diffRight} on right`);
          chart = chart.line(
            { x: right.xLast, y: y - 1 },
            { x: right.xLast - right.f + 1, y: y - 1 },
            stitches.FXL1
          );
        } else if (diffRight === 1) {
          // console.log(`inc ${diffRight} on right`);
          chart = chart.line(
            { x: right.xLast, y: y - 1 },
            { x: right.xLast - right.f + 1, y: y - 1 },
            stitches.FXR1
          );
        }
      }

      activeEdges[i].xLast = xLeft;
      activeEdges[i + 1].xLast = xRight;
    }

    y++;

    activeEdges = activeEdges.filter((edge) => edge.yMax > y); // filter out any edges we've passed

    for (let i = 0; i < activeEdges.length; i++) {
      activeEdges[i].x += activeEdges[i].slope; // update the x value for each edge
    }
  }

  return chart;
}
