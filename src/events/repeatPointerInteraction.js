import { GLOBAL_STATE, dispatch } from "../state";
import { posAtCoords } from "../utils";

import { repeatEditingTools } from "../actions/repeatEditingTools";

function getRepeatIndex(elem) {
  elem = elem.parentNode;
  while (elem) {
    if (elem.hasAttribute("data-repeatindex"))
      return Number(elem.dataset.repeatindex);
    elem = elem.parentNode;
  }
  return null;
}

function editRepeat(repeatIndex, repeatCanvas, tool) {
  // tool onMove is not called unless pointer moves into another cell in the chart
  let pos = GLOBAL_STATE.repeatPos;
  dispatch({ transforming: true });

  let onMove = tool(repeatIndex, pos);
  if (!onMove) return;

  function move(moveEvent) {
    if (moveEvent.buttons == 0) {
      end();
    } else {
      let newPos = GLOBAL_STATE.repeatPos;
      if (newPos.x == pos.x && newPos.y == pos.y) return;
      onMove(newPos);
      pos = newPos;
    }
  }

  function end() {
    dispatch({ transforming: false });

    repeatCanvas.removeEventListener("pointermove", move);
    repeatCanvas.removeEventListener("pointerup", end);
    repeatCanvas.removeEventListener("pointerleave", end);
  }

  repeatCanvas.addEventListener("pointermove", move);
  repeatCanvas.addEventListener("pointerup", end);
  repeatCanvas.addEventListener("pointerleave", end);
}

function resizeRepeat(e, repeatIndex) {
  const startRepeat = GLOBAL_STATE.repeats[repeatIndex].bitmap;
  const startPos = [e.clientX, e.clientY];
  const resizeDragger = e.target;
  dispatch({ transforming: true });

  document.body.classList.add("grabbing");
  resizeDragger.classList.remove("grab");

  const end = () => {
    dispatch({ transforming: false });

    document.body.classList.remove("grabbing");

    window.removeEventListener("pointermove", onmove);
    window.removeEventListener("pointerup", end);

    resizeDragger.classList.add("grab");
  };

  const onmove = (e) => {
    let newWidth =
      startRepeat.width -
      Math.floor(
        (startPos[0] - e.clientX) / (GLOBAL_STATE.scale / devicePixelRatio)
      );

    let newHeight =
      startRepeat.height +
      Math.floor(
        (startPos[1] - e.clientY) / (GLOBAL_STATE.scale / devicePixelRatio)
      );

    if (newHeight == startRepeat.height && newWidth == startRepeat.width)
      return;

    if (newHeight < 1 || newWidth < 1) return;

    dispatch({
      repeats: [
        ...GLOBAL_STATE.repeats.slice(0, repeatIndex),
        {
          ...GLOBAL_STATE.repeats[repeatIndex],
          bitmap: startRepeat.vFlip().resize(newWidth, newHeight).vFlip(),
        },
        ...GLOBAL_STATE.repeats.slice(repeatIndex + 1),
      ],
    });
  };

  window.addEventListener("pointermove", onmove);
  window.addEventListener("pointerup", end);
}

function moveRepeat(e, repeatIndex) {
  const startRepeatPos = [...GLOBAL_STATE.repeats[repeatIndex].pos];
  const startPos = [e.clientX, e.clientY];
  const moveDragger = e.target;
  dispatch({ transforming: true });

  document.body.classList.add("grabbing");
  moveDragger.classList.remove("grab");

  const end = () => {
    dispatch({ transforming: false });

    document.body.classList.remove("grabbing");

    window.removeEventListener("pointermove", onmove);
    window.removeEventListener("pointerup", end);

    moveDragger.classList.add("grab");
  };

  const onmove = (e) => {
    let newX =
      startRepeatPos[0] -
      Math.floor(
        (startPos[0] - e.clientX) / (GLOBAL_STATE.scale / devicePixelRatio)
      );

    let newY =
      startRepeatPos[1] +
      Math.floor(
        (startPos[1] - e.clientY) / (GLOBAL_STATE.scale / devicePixelRatio)
      );

    newX = newX < 0 ? 0 : newX;
    newY = newY < 0 ? 0 : newY;

    dispatch({
      repeats: [
        ...GLOBAL_STATE.repeats.slice(0, repeatIndex),
        {
          ...GLOBAL_STATE.repeats[repeatIndex],
          pos: [newX, newY],
        },
        ...GLOBAL_STATE.repeats.slice(repeatIndex + 1),
      ],
    });
  };

  window.addEventListener("pointermove", onmove);
  window.addEventListener("pointerup", end);
}

export function repeatPointerInteraction(repeatContainer) {
  repeatContainer.addEventListener("pointerdown", (e) => {
    const repeatIndex = getRepeatIndex(e.target);
    let classList = e.target.classList;

    if (
      GLOBAL_STATE.editingRepeat != repeatIndex &&
      classList.contains("repeat-canvas")
    ) {
      // If we're not editing this repeat, begin editing it
      console.log("NOW EDITING REPEAT", repeatIndex);
      dispatch({ editingRepeat: repeatIndex });
      return;
    }

    if (classList.contains("resize-repeat")) {
      // interacting with dragger

      resizeRepeat(e, repeatIndex);
    } else if (classList.contains("move-repeat")) {
      // interacting with dragger
      moveRepeat(e, repeatIndex);
    } else if (classList.contains("repeat-canvas")) {
      // interacting with canvas
      const activeTool = GLOBAL_STATE.activeTool;

      if (activeTool in repeatEditingTools) {
        editRepeat(repeatIndex, e.target, repeatEditingTools[activeTool]);
      } else {
        console.console.warn(`Uh oh, ${activeTool} is not a tool`);
      }
    }
  });

  repeatContainer.addEventListener("pointermove", (e) => {
    if (GLOBAL_STATE.editingRepeat < 0) {
      const { x, y } = posAtCoords(e, repeatContainer);

      if (GLOBAL_STATE.pos.x != x || GLOBAL_STATE.pos.y != y) {
        dispatch({ pos: { x, y } });
      }
    } else {
      const { x, y } = posAtCoords(e, e.target);

      if (GLOBAL_STATE.pos.x != x || GLOBAL_STATE.pos.y != y) {
        dispatch({ repeatPos: { x, y } });
      }
    }
  });
}