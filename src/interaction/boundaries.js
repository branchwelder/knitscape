import { GLOBAL_STATE, dispatch } from "../state";
import { stitches } from "../constants";

export function removeBoundary(index) {
  const { boundaries, regions } = GLOBAL_STATE;

  dispatch({
    boundaries: boundaries.slice(0, index).concat(boundaries.slice(index + 1)),
    regions: regions.slice(0, index).concat(regions.slice(index + 1)),
    selectedBoundary: null,
  });
}

function addPoint(e) {
  const rect = e.currentTarget.getBoundingClientRect();

  const boundaryIndex = Number(e.target.dataset.boundaryindex);
  const pointIndex = Number(e.target.dataset.index);

  const {
    scale,
    cellAspect,
    boundaries,
    chartPan: { x, y },
  } = GLOBAL_STATE;

  let pt = [
    Math.round((e.clientX - rect.left - x) / scale),
    Math.round((rect.height - (e.clientY - rect.top) - y) / scale / cellAspect),
  ];

  let newBounds = [...boundaries];
  newBounds[boundaryIndex].splice(pointIndex + 1, 0, pt);

  dispatch({ boundaries: newBounds });
}

function deletePoint(e) {
  const boundaryIndex = Number(e.target.dataset.boundaryindex);
  const pointIndex = Number(e.target.dataset.index);

  let newBounds = [...GLOBAL_STATE.boundaries];
  newBounds[boundaryIndex].splice(pointIndex, 1);

  dispatch({
    boundaries: newBounds,
  });
}

function dragPoint(e) {
  const boundaryIndex = Number(e.target.dataset.boundaryindex);
  const pointIndex = Number(e.target.dataset.index);

  const [x, y] = GLOBAL_STATE.boundaries[boundaryIndex][pointIndex];
  let last = [0, 0];

  const startPos = { x: e.clientX, y: e.clientY };
  dispatch({ transforming: true });

  function move(e) {
    if (e.buttons == 0) {
      end();
    } else {
      const { scale, cellAspect, boundaries } = GLOBAL_STATE;

      let dx = Math.round((startPos.x - e.clientX) / scale);
      let dy = Math.round((startPos.y - e.clientY) / scale / cellAspect);

      if (last[0] == dx && last[1] == dy) return;

      let newBounds = [...boundaries];

      newBounds[boundaryIndex][pointIndex] = [x - dx, y + dy];

      last = [dx, dy];

      dispatch({
        boundaries: newBounds,
      });
    }
  }

  function end() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointerleave", end);
    dispatch({ transforming: false });
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointerleave", end);
}

function dragPath(e) {
  const boundaryIndex = Number(e.target.dataset.boundaryindex);
  const pointIndex = Number(e.target.dataset.index);

  const boundary = GLOBAL_STATE.boundaries[boundaryIndex];

  const [x0, y0] = boundary[pointIndex];
  const [x1, y1] = boundary[(pointIndex + 1) % boundary.length];
  let last = [0, 0];

  const startPos = { x: e.clientX, y: e.clientY };

  dispatch({ transforming: true });

  function move(e) {
    if (e.buttons == 0) {
      end();
    } else {
      const { scale, cellAspect, boundaries } = GLOBAL_STATE;

      let dx = Math.round((startPos.x - e.clientX) / scale);
      let dy = Math.round((startPos.y - e.clientY) / scale / cellAspect);

      if (last[0] == dx && last[1] == dy) return;

      let newBounds = [...boundaries];

      newBounds[boundaryIndex][pointIndex] = [x0 - dx, y0 + dy];
      newBounds[boundaryIndex][(pointIndex + 1) % boundary.length] = [
        x1 - dx,
        y1 + dy,
      ];

      last[0] = dx;
      last[1] = dy;

      dispatch({
        boundaries: newBounds,
      });
    }
  }

  function end() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointerleave", end);
    dispatch({ transforming: false });
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointerleave", end);
}

function dragBoundary(e) {
  const boundaryIndex = Number(e.target.dataset.boundaryindex);

  if (GLOBAL_STATE.selectedBoundary != boundaryIndex) return;

  const startBounds = GLOBAL_STATE.boundaries[boundaryIndex];
  const startPos = { x: e.clientX, y: e.clientY };

  const [fillX, fillY] = GLOBAL_STATE.regions[boundaryIndex].pos;

  let last = [0, 0];
  dispatch({ transforming: true });

  function move(e) {
    if (e.buttons == 0) {
      end();
    } else {
      const { scale, cellAspect, boundaries } = GLOBAL_STATE;

      let dx = Math.round((startPos.x - e.clientX) / scale);
      let dy = Math.round((startPos.y - e.clientY) / scale / cellAspect);

      if (last[0] == dx && last[1] == dy) return;

      let newBounds = [...boundaries];
      newBounds[boundaryIndex] = startBounds.map(([x, y]) => [x - dx, y + dy]);
      last = [dx, dy];

      let updatedRegions = [...GLOBAL_STATE.regions];
      updatedRegions[boundaryIndex].pos = [fillX - dx, fillY + dy];
      dispatch({
        boundaries: newBounds,
        regions: updatedRegions,
      });
    }
  }

  function end() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointerleave", end);
    dispatch({ transforming: false });
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointerleave", end);
}

function editBoundary(e) {
  const boundaryIndex = Number(e.target.dataset.boundaryindex);

  dispatch({ selectedBoundary: boundaryIndex }, true);
}

export function editStitchFill(e) {}

export function resizeFillBlock(e, direction) {
  const { selectedBoundary, regions, cellWidth, cellHeight, blockEditMode } =
    GLOBAL_STATE;
  const { stitchBlock, yarnBlock, pos } = regions[selectedBoundary];

  const bmp = blockEditMode == "stitch" ? stitchBlock : yarnBlock;
  const [x, y] = pos;
  let last = [0, 0];

  const startPos = { x: e.clientX, y: e.clientY };
  dispatch({ transforming: true, locked: true });

  function move(e) {
    if (e.buttons == 0) {
      end();
    } else {
      const { scale, cellAspect, blocks } = GLOBAL_STATE;

      let dx = Math.round((startPos.x - e.clientX) / scale);
      let dy = Math.round((startPos.y - e.clientY) / scale / cellAspect);

      if (last[0] == dx && last[1] == dy) return;

      let updatedBlock;
      let updatedPos = [...pos];

      let fill;
      if (blockEditMode == "stitch") {
        fill = stitches.TRANSPARENT;
      } else {
        fill = 0;
      }

      if (direction == "up") {
        let newHeight = bmp.height + dy;
        if (newHeight < 1) return;

        updatedBlock = bmp.resize(bmp.width, newHeight, fill);
      } else if (direction == "right") {
        let newWidth = bmp.width - dx;
        if (newWidth < 1) return;

        updatedBlock = bmp.resize(newWidth, bmp.height, fill);
      } else if (direction == "down") {
        let newHeight = bmp.height - dy;
        if (newHeight < 1) return;

        updatedBlock = bmp.vFlip().resize(bmp.width, newHeight, fill).vFlip();
        updatedPos = [x, y + dy];
      } else if (direction == "left") {
        let newWidth = bmp.width + dx;
        if (newWidth < 1) return;

        updatedBlock = bmp.hFlip().resize(newWidth, bmp.height, fill).hFlip();
        updatedPos = [x - dx, y];
      }

      last = [dx, dy];

      let updatedRegions = [...regions];
      updatedRegions[selectedBoundary].pos = updatedPos;

      // update either the stitch or yarn block
      if (blockEditMode == "stitch") {
        updatedRegions[selectedBoundary].stitchBlock = updatedBlock;
      } else {
        updatedRegions[selectedBoundary].yarnBlock = updatedBlock;
      }

      dispatch({
        regions: updatedRegions,
      });
    }
  }

  function end() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointerleave", end);
    dispatch({ transforming: false, locked: false });
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointerleave", end);
}
export function boundaryModePointerDown(e) {
  const cl = e.target.classList;

  if (cl.contains("point")) {
    // point is only shown if the boundary is selected
    dragPoint(e);
  } else if (cl.contains("path")) {
    // path is only shown if the boundary is selected
    dragPath(e);
  } else if (cl.contains("boundary")) {
    editBoundary(e);
    dragBoundary(e);
  }
}

export function boundaryModeContextMenu(e) {
  if (e.target.classList.contains("point")) {
    deletePoint(e);
  } else if (e.target.classList.contains("path")) {
    addPoint(e);
  }
}
