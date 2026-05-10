# Mobile Touch Design - First Principles Analysis

## Current Problem

Drag selection works accidentally but fails when attempted deliberately. This suggests the detection logic is fundamentally misaligned with natural touch behavior.

## How Touch Actually Works

### The Event Sequence
```
touchstart → touchmove (0 to many) → touchend
```

### Physical Reality
1. **Fingers are imprecise** - Touch point is ~40-50px area, not a point
2. **Fingers obscure the target** - User can't see what's under their finger
3. **Micro-movements are constant** - Even a "still" finger moves 5-15px
4. **Deliberate movements are slower** - Accidental swipes are fast; careful selection is slow

## Why Current Approach Fails

The current design uses a **pixel threshold** (10px) to distinguish tap from drag:
- Move < 10px → treated as tap
- Move > 10px → treated as drag

### Problems with pixel threshold:

1. **Penalizes careful users**: When deliberately dragging, users move slowly and carefully. The touchmove events fire, but the cumulative movement may not cross the threshold quickly. Meanwhile, accidental fast swipes easily cross 10px.

2. **Ignores semantic meaning**: A 15px movement might stay on the same tile (not meaningful) or cross to an adjacent tile (very meaningful). Pixels don't capture intent.

3. **Device-dependent**: 10px means different things on different screen densities and tile sizes.

4. **Fighting the browser**: Mobile browsers have their own touch handling. Thresholds can conflict with scroll detection, causing dropped events.

## Proposed Design: Tile-Based Detection

Instead of "did the finger move N pixels?", ask "did the finger move to a different tile?"

### Core Principle
**The tile is the unit of interaction, not the pixel.**

### Simplified State Machine

```
IDLE
  ↓ touchstart on tile
TOUCHING (tile A selected, highlighted immediately)
  ↓ touchmove to different tile B (adjacent to A)
DRAGGING (tiles A,B selected)
  ↓ touchmove to tile C (adjacent to B)
DRAGGING (tiles A,B,C selected)
  ↓ touchend
IDLE (auto-submit word)

TOUCHING
  ↓ touchend (still on tile A, no movement to other tiles)
IDLE (tile A toggled via tap logic)
```

### Key Differences from Current Design

| Aspect | Current | Proposed |
|--------|---------|----------|
| Drag trigger | 10px movement | Movement to different tile |
| Initial feedback | Delayed until threshold | Immediate on touchstart |
| Detection unit | Pixels | Tiles |
| Tap detection | No drag detected | No tile change detected |

### Implementation Rules

1. **On touchstart**:
   - Immediately identify and highlight the starting tile
   - Record starting tile (not pixel coordinates)
   - User sees immediate feedback

2. **On touchmove**:
   - Identify current tile under finger
   - If current tile ≠ last tile AND is adjacent → add to path
   - If current tile = last tile → ignore (finger still on same tile)
   - If current tile is already in path → backtrack (undo to that point)
   - No pixel math needed

3. **On touchend**:
   - If path length = 1 → treat as tap (toggle selection)
   - If path length > 1 → treat as drag (auto-submit)

### Why This Should Work Better

1. **No threshold to fight**: The question isn't "did you move enough?" but "did you reach a new tile?" This matches what users are actually trying to do.

2. **Immediate feedback**: Highlighting on touchstart tells users the system is responding. Current delay until threshold creates uncertainty.

3. **Natural backtracking**: Dragging back over previous tiles should undo them. This is intuitive and forgiving.

4. **Speed-independent**: Works the same whether user drags fast or slow, because we only care about tile boundaries, not velocity.

5. **Device-independent**: Tile positions are known; no magic pixel numbers that need tuning per device.

## Visual Feedback Improvements

Current visual feedback may also contribute to the "it's not working" feeling:

1. **Instant highlight**: First tile should highlight on touchstart, not after movement
2. **Trail effect**: As drag proceeds, show clear visual path
3. **Drag indicator**: Consider showing the word building in real-time above the board
4. **Touch target expansion**: While dragging, slightly expand adjacent tile hit areas

## Edge Cases to Handle

1. **Diagonal movement**: Finger might cut corner through non-adjacent tile. Should we allow jumping, or require strict adjacency?
   - Recommendation: Strict adjacency, but with generous hit detection

2. **Fast swiping**: User swipes quickly across multiple tiles. touchmove events may skip tiles.
   - Recommendation: Interpolate path between last known tile and current tile if they're not adjacent

3. **Finger lift and re-touch**: User lifts finger mid-word then touches again
   - Recommendation: touchend commits/cancels; new touchstart begins fresh

4. **Multi-touch**: Second finger touches while dragging
   - Recommendation: Ignore additional touches, continue with first

## Testing Criteria

The implementation should pass these tests:

1. Slow deliberate drag across 3 tiles → selects all 3
2. Fast swipe across 5 tiles → selects all 5 (or interpolated path)
3. Touch and hold without moving → highlights 1 tile, release = tap
4. Drag to tile then drag back → deselects the tile (backtrack)
5. Works identically on iOS Safari, Chrome Android, Firefox Android

## Summary

**Stop counting pixels. Start counting tiles.**

The fundamental insight is that the game is played on a grid of tiles, so touch detection should operate in tile-space, not pixel-space. This aligns the implementation with user intent and eliminates threshold-tuning problems.
