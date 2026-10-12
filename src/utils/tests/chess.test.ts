import { expect, test } from "vitest";
import { ANNOTATION_INFO, type Annotation, NAG_INFO } from "../annotation";
import { createTreeStore } from "@/state/store/tree";
import { applySavedPosition, hasMorePriority, headersToPGN, parsePositionPath } from "../chess";
import { defaultTree, type TreeState } from "../treeReducer";

test("NAGs are consistent", () => {
    for (const k of Object.keys(ANNOTATION_INFO)) {
        if (k === "") continue;
        const nag = ANNOTATION_INFO[k as Annotation].nag!;
        expect(NAG_INFO.get(`$${nag}`)).toBe(k);
    }
});

test("priority comparison", () => {
    expect(hasMorePriority([0, 0], [0])).toBe(false);
    expect(hasMorePriority([0], [0, 0])).toBe(true);
    expect(hasMorePriority([0], [1])).toBe(true);
    expect(hasMorePriority([1], [0])).toBe(false);
    expect(hasMorePriority([0, 0], [0, 1])).toBe(true);
    expect(hasMorePriority([0, 1], [0, 0])).toBe(false);
    expect(hasMorePriority([0, 1], [0, 2])).toBe(true);
    expect(hasMorePriority([0, 2], [0, 1])).toBe(false);
});

function treeWithMoves(moves: string[], position: number[], start?: number[]): TreeState {
    const store = createTreeStore();
    store.getState().makeMoves({ payload: moves });
    const { root, headers } = store.getState();
    return {
        ...defaultTree(),
        root,
        headers: { ...headers, start, current_position: position },
    };
}

test("parse saved position path", () => {
    expect(parsePositionPath("[0,0,1]")).toEqual([0, 0, 1]);
    expect(parsePositionPath("[]")).toEqual([]);
    expect(parsePositionPath(undefined)).toBeUndefined();
    expect(parsePositionPath("not json")).toBeUndefined();
    expect(parsePositionPath("[0,-1]")).toBeUndefined();
    expect(parsePositionPath('{"a":1}')).toBeUndefined();
});

test("apply saved position", () => {
    const tree = treeWithMoves(["e4", "e5", "Nf3"], [0, 0]);
    applySavedPosition(tree);
    expect(tree.position).toEqual([0, 0]);
    expect(tree.headers.current_position).toBeUndefined();
});

test("apply saved position falls back to existing prefix", () => {
    const tree = treeWithMoves(["e4", "e5"], [0, 1, 0]);
    applySavedPosition(tree);
    expect(tree.position).toEqual([0]);
});

test("apply saved position falls back to start", () => {
    const tree = treeWithMoves(["e4", "e5"], [], [0]);
    applySavedPosition(tree);
    expect(tree.position).toEqual([0]);
});

test("current position is written to PGN headers", () => {
    const headers = { ...defaultTree().headers, current_position: [0, 0, 1] };
    expect(headersToPGN(headers)).toContain('[CurrentPosition "[0,0,1]"]');
    expect(headersToPGN({ ...headers, current_position: [] })).not.toContain("CurrentPosition");
});
