let stage;
let root;

window.addEventListener("load", () => {
  stage = new createjs.Stage("vis");

  document.getElementById("program").addEventListener("change", () => {
    update();
  });

  document.getElementById("step").addEventListener("click", () => {
    root.executeTick();
    // root.debugPrintSubtree();
    redraw();
    if (executionState.universeDestroyed) {
      alert("universe destroyed!");
    } 
  });

  update();
});


function redraw() {
  stage.clear();
  stage.removeAllChildren();
  root.draw(stage, 40, 40);
}


function update() {
  const tokens = tokenize(document.getElementById("program").value);
  console.log(tokens);

  root = buildTree(tokens);
  root.debugPrintSubtree();

  redraw();

  executionState.running = false;
  executionState.universeDestroyed = false;
}

function homespringError(msg) {
  console.error(msg);
}

function homespringOutput(text) {
  document.getElementById("output").value += text; 
}

function homespringGetInput() {
  const input = document.getElementById("input").value; 
  document.getElementById("input").value = "";
  return input;
}

const executionState = {
  running: false,
  universeDestroyed: false,
};


/**
 * A nice-tasting fish.
 */
class Salmon {
  constructor(name, age, direction) {
    this.name = name;
    this.age = age; // one of "young", "mature"
    this.direction = direction; // one of "up", "down"
    this.delay = 0; // how many more ticks the salmon has been held in its current Node
    this.arrivedFrom = -1;

    // DEBUG quick check for typos
    if (age !== "young" && age !== "mature") {
      console.error("typo somewhere, got age of", age);
    }
    if (direction !== "up" && direction !== "down") {
      console.error("typo somewhere, got direction of", direction);
    }
  }

  /**
   * Call this whenever the salmon moves from one Node to another.
   * @param {number} sourceIdx the index of the source node in its parent's children list
   */
  moves(sourceIdx) {
    this.delay = 0;
    this.arrivedFrom = sourceIdx;
  }
}


/**
 * Node in the tree of the Homespring program.
 */
class Node {
  /**
   * @param {string} name 
   * @param {?Node} parent 
   */
  constructor(name, parent) {
    this.originalName = name;
    this.name = name.toLowerCase();
    this.children = [];
    this.parent = parent;

    this.salmon = [];
    this.destroyed = false;
    this.youngBearIsSated = false;
    this.isASpring = false;
    // since stuff like water, snow can be slowed down through certain nodes,
    // we store state as an integer. -1 means not present, 0 means present,
    // 1 means present but delayed by 1 turn, ditto 2 by 2 turns, etc.
    this.water = -1;
    this.snow = -1;

    const RESERVED_NAMES = ["hatchery", "hydro power", "snowmelt", "shallows", "rapids", "append down",
      "bear", "force field", "sense", "clone", "young bear", "bird", "upstream killing device",
      "waterfall", "universe", "powers", "marshy", "insulated", "upstream sense", "downstream sense",
      "evaporates", "youth fountain", "oblivion", "pump", "range sense", "fear", "reverse up",
      "reverse down", "time", "lock", "inverse lock", "young sense", "switch", "young switch", "narrows",
      "append up", "young range sense", "net", "force down", "force up", "spawn", "power invert",
      "current", "bridge", "split", "range switch", "young range switch"
    ];

    if (!RESERVED_NAMES.includes(this.name)) {
      // this.water = 0;
      this.isASpring = true;
    }

    this.cachedDrawingValues = null;
  }
  
  /**
   * Create and add a child with given name to this Node.
   * @param {string} name name of child Node 
   * @returns the newly created child Node
   */
  addChild(name) {
    const newChild = new Node(name, this);
    this.children.push(newChild);
    return newChild;
  }

  /**
   * Checks if any child tests true against the provided test function.
   * @param {(fsh: Salmon) => boolean} testFunc function to test children against 
   * @returns boolean result of check
   */
  hasChildWith(testFunc) {
    for (let child of this.children) {
      if (testFunc(child)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if any resident salmon test true against the provided test function.
   * @param {(fsh: Salmon) => boolean} testFunc function to test salmon against 
   * @returns boolean result of check
   */
  hasSalmonWith(testFunc) {
    for (let fsh of this.salmon) {
      if (testFunc(fsh)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Same as hasSalmonWith but runs on this Node and every child.
   * @param {(fsh: Salmon) => boolean} testFunc function to test salmon against 
   * @returns boolean result of check
   */
  hasSalmonUpstreamWith(testFunc) {
    if (this.hasSalmonWith(testFunc)) {
      return true;
    }
    if (this.children.length !== 0) {
      for (let child of this.children) {
        if (child.hasSalmonUpstreamWith(testFunc)) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * @returns current power status of node 
   */
  isPowered() {
    if (this.name === "sense" && this.hasSalmonWith(x => x.age === "mature")) {
      return false;
    }

    if (this.name === "upstream sense" && this.hasSalmonWith(x => x.direction === "up" && x.age === "mature")) {
      return false;
    }

    if (this.name === "downstream sense" && this.hasSalmonWith(x => x.direction === "down" && x.age === "mature")) {
      return false;
    }

    if (this.name === "range sense" && this.hasSalmonUpstreamWith(x => x.age === "mature")) {
      return false;
    }

    if (this.name === "young range sense" && this.hasSalmonUpstreamWith(x => x.age === "young")) {
      return false;
    }

    if (this.name === "young sense" && this.hasSalmonWith(x => x.age === "young")) {
      return false;
    }

    if (this.name === "switch" && !this.hasSalmonWith(x => x.age === "mature")) {
      return false;
    }

    if (this.name === "young switch" && !this.hasSalmonWith(x => x.age === "young")) {
      return false;
    }

    if (this.name === "range switch" && !this.hasSalmonUpstreamWith(x => x.age === "mature")) {
      return false;
    }

    if (this.name === "young range switch" && !this.hasSalmonUpstreamWith(x => x.age === "young")) {
      return false;
    }

    if (this.name === "powers") {
      return true;
    }

    if (this.name === "insulated") {
      return false;
    }

    if (this.name === "hydro power" && this.water > -1) {
      return true;
    }

    if (this.name === "power invert") {
      return !this.hasChildWith((x) => x.isPowered());
    }

    return this.hasChildWith((x) => x.isPowered());
  }

  /**
   * Destroys this Node, removing its functionality and name
   */
  destroy() {
    // when the universe is destroyed by a snowmelt, the game is up
    if (this.name === "universe") {
      // global state hackery
      executionState.universeDestroyed = true;
    }
    
    this.destroyed = true;
    if (this.name !== "bridge") {
      this.name = "";
      this.isASpring = true;
      this.water = 0;
    }
  }

  /**
   * @returns whether this Node can be destroyed by a snowmelt 
   */
  isDestroyedBySnowmelt() {
    const DESTROYABLE = ["hydro power", "universe", "oblivion", "power invert", "bridge"];
    return DESTROYABLE.includes(this.name);
  }

  /**
   * Visits each Node in the subtree in a pre-order fashion.
   * @param {function} func the function to run upon visiting a Node
   */
  preorderPropagate(func) {
    func.call(this);
    this.children.forEach((child) => {
      child.preorderPropagate(func);
    });
  }

  /**
   * Visits each Node in the subtree in a post-order fashion.
   * @param {function} func the function to run upon visiting a Node
   */
  postorderPropagate(func) {
    this.children.forEach((child) => {
      child.postorderPropagate(func);
    });
    func.call(this);
  }

  /**
   * @param {string} name the name to search for
   * @returns whether the subtree of this Node contains a child with the given name
   */
  nameInSubtree(name, skipRoot = true) {
    if (this.originalName === name && !skipRoot) {
      return true;
    }
    for (let child of this.children) {
      if (child.nameInSubtree(name, false)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {Salmon} fsh fosh
   * @returns whether this Node allows the given salmon to leave
   */
  salmonCanLeave(fsh) {
    if (this.name === "pump" && this.isPowered()) {
      return false;
    }
    if (this.name === "lock" && fsh.direction === "down" && this.isPowered()) {
      return false;
    }
    if (this.name === "inverse lock" && fsh.direction === "down" && !this.isPowered()) {
      return false;
    }
    if (this.name === "narrows" && this.salmon.length > 1) {
      return false;
    }
    if (this.name === "net" && fsh.age === "mature") {
      return false;
    }
    if (this.name === "current" && fsh.age === "young") {
      return false;
    }
    if (this.name === "bridge" && this.destroyed) {
      return false;
    }
    return true;
  } 

  /**
   * @param {Salmon} fsh the fishy 
   * @returns whether this Node allows the given salmon to enter 
   */
  acceptsSalmon(fsh, from) {
    if (this.name === "waterfall" && fsh.direction === "up") {
      return false;
    }
    if (from.name === "force up" && fsh.direction === "up" && from.children.indexOf(this) === 0) {
      return false;
    }
    if (from.name === "force down" && fsh.direction === "up" && from.children.indexOf(this) === from.children.length - 1) {
      return false;
    }

    return true;
  }

  /**
   * Checks if a salmon can move this tick. If not, increases the delay counter.
   * @param {Salmon} fsh fish
   * @returns whether the salmon is allowed to move this turn (this does not take into account blocking)
   */
  salmonCanMove(fsh) {
    if (this.name === "shallows" && fsh.age === "mature" && fsh.delay === 0) {
      fsh.delay += 1;
      return false;
    }
    
    if (this.name === "rapids" && fsh.age === "young" && fsh.delay === 0) {
      fsh.delay += 1;
      return false;
    }
    
    return true;
  }

  /**
   * Forces all salmon at this node and all nodes of subtree to spawn.
   */
  spawnUpstream() {
    const newSalmon = [];
    this.salmon.forEach((fsh) => {
      fsh.age = "mature";
      fsh.direction = "down";
      newSalmon.push(new Salmon(this.originalName, "young", "down"));
    });
    this.salmon.push(...newSalmon);

    this.children.forEach(child => child.spawnUpstream());
  }

  //===============================================
  // Ticks
  //===============================================

  /**
   * From the spec: 
   *     In the snow tick, the snow state of each node is updated. A node becomes snowy
   *     if it is not currently blocking snowmelts and if one of its children is snowy. The
   *     snow tick is propagated in a post-order fashion.
   *     Certain nodes will be destroyed when snowmelt reaches them. A node that
   *     is destroyed loses its abilities and its name (its name becomes “”). 
   * 
   * I think that the assertion that this is propagated post-order must be an error.
   * If this were the case, snowmelt would propogate instantly down the tree, but this
   * doesn't happen in the reference implementation.
   */
  snowTick() {
    this.children.forEach((x) => {
      // propagate snowmelt up to this Node if child is snowy 
      if (x.snow === 0 && this.snow === -1) {
        if (this.name === "marshy") {
          this.snow = 1;
        } else {
          this.snow = 0;
        }
      // if the child is snowy but delayed, decrease the counter
      } else if (x.snow > 0) {
        x.snow -= 1;
      } 
    });

    // destroy if snowmelt has reached the Node and it is destroyable
    if (this.snow >= 0 && this.isDestroyedBySnowmelt()) {
      this.destroy();
    }

    if (this.name === "force field" && this.isPowered()) {
      this.snow = -1;
    }

    if (this.name === "lock" && this.isPowered()) {
      this.snow = -1;
    }

    if (this.name === "inverse lock" && !this.isPowered()) {
      this.snow = -1;
    }

    if (this.name === "snowmelt") {
      this.snow = 0;
    }

    if (this.name === "evaporates" && this.isPowered()) {
      this.snow = -1;
    }

    if (this.name === "bridge" && this.destroyed) {
      this.snow = -1;
    }
  }

  /**
   * From the spec:
   *     In the water tick, the water state of each node is updated. A node becomes
   *     watered if it is not currently blocking water and if one of its children is watered.
   *     The water tick is propagated in a post-order fashion.  
   *
   * As with snow, I think this is really meant to be pre- rather than post-order. 
   */
  waterTick() {
    this.children.forEach((x) => {
      // propagate water up to this Node if child is watered 
      if (x.water === 0) {
        this.water = 0;
      } 
    });

    if (this.isASpring) {
      this.water = 0;
    }

    if (this.name === "evaporates" && this.isPowered()) {
      this.water = -1;
    }

    if (this.name === "bridge" && this.destroyed) {
      this.water = -1;
    }
  }

  /**
   * From the spec:
   *     Unlike the snow and water ticks, the power tick does not calculate the power
   *     state of each node; it merely calculates, for each node, whether that node should
   *     generate power. The power state of each node is calculated on demand by
   *     checking for powered children. 
   */
  powerTick() {
    // TODO
  }

  /**
   * From the spec:
   *     This part of the fish tick only affects downstream salmon. Each downstream
   *     salmon is moved to the parent of its current node if it is not blocked from doing
   *     so. If its current node is the mouth of the river, the salmon is removed from the
   *     river system and its name is printed to the terminal.
   *     This tick propagates in a pre-order fashion.
   */
  fishTickDown() {
    const toRemove = [];
    this.salmon.forEach((fsh, idx) => {
      if (fsh.direction !== "down") {
        return;
      }
     

      // need to do this here so that the counter is updated no matter what
      const canMove = this.salmonCanMove(fsh);

      // check if blocked from moving
      if (this.parent && !this.parent.acceptsSalmon(fsh, this)) {
        return;
      }

      if (!this.salmonCanLeave(fsh)) {
        return;
      }

      if (this.parent === null) {
        homespringOutput(fsh.name);
        toRemove.splice(0, 0, idx);
      } else if (canMove) {
        this.parent.salmon.splice(0, 0, fsh);
        fsh.moves(this.parent.children.indexOf(this));
        toRemove.splice(0, 0, idx);
      }
    });

    // remove salmon which have moved downstream
    toRemove.forEach((idx) => this.salmon.splice(idx, 1));
  }

  /**
   * From the spec:
   *     This part of the fish tick only affects upstream salmon. For each upstream
   *     salmon, an in-order search of the river system is conducted in order to find
   *     a river node with the same name as the salmon. If there is such a node and
   *     the salmon is not prevented from moving towards it, the salmon moves towards
   *     that node. If there is no such node or if the salmon is prevented from moving
   *     towards that node, the salmon will attempt to move (in order) to each child of
   *     the current node. If the salmon cannot move to any child of the current node
   *     or if there are no children of the current node, the salmon will spawn at the
   *     current node.
   *     When a salmon spawns, it becomes mature and its direction becomes down-
   *     stream. A new salmon is created at the current node. The new salmon is young,
   *     downstream and its name is the name of the current node.
   *     This tick propagates in a post-order fashion.
   */
  fishTickUp() {
    const toRemove = [];
    const newSalmon = [];
    this.salmon.forEach((fsh, idx) => {
      if (fsh.direction !== "up") {
        return;
      }

      // no need to do any searching if the salmon can't move this turn
      // also note that nodes blocking salmon are mutually exclusive with
      // nodes which delay salmon so this check can be independent of the
      // blocking/spawning check
      if (!this.salmonCanMove(fsh)) {
        return;
      }

      // TODO check if blocked
      const isBlocked = false;
      if (!this.salmonCanLeave()) {
        isBlocked = true;
      }

      if (!isBlocked) {
        // decide which branch to travel down
        let target = -1;
        for (let i = 0; i < this.children.length; i++) {
          const child = this.children[i];
          if (child.nameInSubtree(fsh.name) && child.acceptsSalmon(fsh, this)) {
            target = i;
            break;
          } 
        }

        // if we can't find node with salmon's name, just pick the first available child
        if (target === -1) {
          for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (child.acceptsSalmon(fsh, this)) {
              target = i;
              break;
            } 
          }
        }

        // move salmon if this is possible
        if (target > -1) {
          toRemove.splice(0, 0, idx);
          this.children[target].salmon.push(fsh);
          fsh.moves(this.parent.children.indexOf(this));
          return;
        } 
      }

      // spawn if stuck
      fsh.age = "mature";
      fsh.direction = "down";
      newSalmon.push(new Salmon(this.originalName, "young", "down"));
    });

    // remove salmon which have moved downstream
    toRemove.forEach((idx) => this.salmon.splice(idx, 1));

    // add newly spawned salmon
    newSalmon.forEach((fsh) => this.salmon.splice(0, 0, fsh));
  }

  /**
   * From the spec:
   *     This tick activates hatcheries. It propagates in a pre-order fashion.
   */
  fishTickHatch() {
    if (this.name !== "hatchery" || !this.isPowered()) {
      return;
    }

    // release a mature salmon from the hatchery
    this.salmon.push(new Salmon("homeless", "mature", "up"));
  }

  /**
   * From the spec:
   *     All other nodes that need to perform some action perform it in this tick, which
   *     propagates in a pre-order fashion. 
   */
  miscTick() {
    // "For each downstream salmon that did not arrive from the first child, destroy
    // that salmon and append its name to each downstream salmon that did arrive
    // from the first child."
    if (this.name === "append down") {
      for (let i = this.salmon.length - 1; i > -1; i--) {
        const fsh = this.salmon[i];
        if (fsh.direction !== "down" || fsh.arrivedFrom === 0) {
          continue;
        }

        this.salmon.forEach((targetFsh) => {
          if (targetFsh.direction !== "down" || targetFsh.arrivedFrom !== 0) {
            return;
          }
          targetFsh.name += fsh.name;
        });

        this.salmon.splice(i, 1);
      }
    }

    // "For each downstream salmon that did not arrive from the first child, destroy
    // that salmon and append its name to each upstream salmon."
    if (this.name === "append up") {
      for (let i = this.salmon.length - 1; i > -1; i--) {
        const fsh = this.salmon[i];
        if (fsh.direction !== "down" || fsh.arrivedFrom === 0) {
          continue;
        }

        this.salmon.forEach((targetFsh) => {
          if (targetFsh.direction !== "up") {
            return;
          }
          targetFsh.name += fsh.name;
        });

        this.salmon.splice(i, 1);
      }
    }

    // "Eats mature salmon."
    if (this.name === "bear") {
      this.salmon = this.salmon.filter(fsh => fsh.age !== "mature");
    }

    // "For each salmon, create a young, downstream salmon with the same name."
    if (this.name === "clone") {
      const newSalmon = this.salmon.map((fsh) => {
        return new Salmon(fsh.name, "young", "down")
      });
      this.salmon.push(...newSalmon);
    }

    // "Eats every other mature salmon (the first mature salmon gets eaten, the second
    // one doesn’t, etc.). Young salmon are moved to the beginning of the list because
    // they don’t have to take the time to evade the bear."
    if (this.name === "young bear") {
      const finalSalmonYoung = [];
      const finalSalmonMature = [];
      for (let i = this.salmon.length - 1; i > -1; i--) {
        const fsh = this.salmon[i];
        if (fsh.age === "young") {
          finalSalmonYoung.push(fsh);
          continue;
        }

        if (this.youngBearIsSated) {
          this.youngBearIsSated = false;
          finalSalmonMature.push(fsh);
        } else {
          // "eat" the salmon at `fsh`
          this.youngBearIsSated = true;
        }
      }

      this.salmon = finalSalmonYoung;
      this.salmon.push(...finalSalmonMature);
    }

    // "Eats young salmon."
    if (this.name === "bird") {
      this.salmon = this.salmon.filter(fsh => fsh.age !== "young");
    }

    // "When powered and if it contains more than one child, kills all the salmon in the
    // last child."
    if (this.name === "upstream killing device" && this.isPowered() && this.children.length > 1) {
      this.children[this.children.length - 1].salmon = [];
    }

    // "Makes all salmon young."
    if (this.name === "youth fountain") {
      this.salmon.forEach(fsh => fsh.age = "young");
    }

    // "When powered, changes the name of each salmon to “”. Can be destroyed by
    // snowmelt."
    if (this.name === "oblivion" && this.isPowered()) {
      this.salmon.forEach(fsh => fsh.name = "");
    }

    // "For each downstream salmon that arrived from the second child, move it to the
    // first child unless it is prevented from moving there."
    if ((this.name === "reverse up" || this.name === "force up") && this.children.length > 1) {
      const toRemove = [];
      this.salmon.forEach((fsh, idx) => {
        if (fsh.direction !== "down" || fsh.arrivedFrom !== 1) {
          return;
        }

        if (this.children[0].acceptsSalmon(fsh, this)) {
          toRemove.splice(0, 0, idx);
          this.children[0].salmon.push(fsh);
          fsh.moves(-1);
        }
      });
      // remove salmon which have moved downstream
      toRemove.forEach((idx) => this.salmon.splice(idx, 1));
    }

    // "For each downstream salmon that arrived from the first child, move it to the
    // second child unless it is prevented from moving there."
    if ((this.name === "reverse down" || this.name === "force down") && this.children.length > 1) {
      const toRemove = [];
      this.salmon.forEach((fsh, idx) => {
        if (fsh.direction !== "down" || fsh.arrivedFrom !== 0) {
          return;
        }

        if (this.children[1].acceptsSalmon(fsh, this)) {
          toRemove.splice(0, 0, idx);
          this.children[1].salmon.push(fsh);
          fsh.moves(-1);
        }
      });
      // remove salmon which have moved downstream
      toRemove.forEach((idx) => this.salmon.splice(idx, 1));
    }

    // "Makes all salmon mature."
    if (this.name === "time") {
      this.salmon.forEach(fsh => fsh.age = "mature");
    }

    // "When powered, makes all salmon upstream spawn."
    if (this.name === "spawn" && this.isPowered()) {
      this.spawnUpstream();
    }

    // "Splits each salmon into a new salmon for each letter in the original salmon’s
    // name. The original salmon are destroyed."
    if (this.name === "split") {
      const newSalmon = [];
      this.salmon.forEach((fsh) => {
        fsh.name.split("").forEach((char) => {
          newSalmon.push(new Salmon(char, fsh.age, fsh.direction));
        });
      })
      this.salmon = newSalmon;
    }
  }

  /**
   * From the spec:
   *     If any input is available on the terminal, an upstream, mature fish is created at
   *     the mouth of the river with the input text as its name.
   */
  inputTick() {
    const input = homespringGetInput(); 
    if (input === "") {
      return;
    }

    this.salmon.splice(0, 0, new Salmon(input, "mature", "up"));
  }

  /**
   * Executes one tick of this Node and its subnodes, considering this Node to be the
   * root (river mouth).
   */
  executeTick() {
    this.preorderPropagate(this.snowTick);
    this.preorderPropagate(this.waterTick);
    this.preorderPropagate(this.powerTick);
    this.preorderPropagate(this.fishTickDown);
    this.postorderPropagate(this.fishTickUp);
    this.preorderPropagate(this.fishTickHatch);

    if (executionState.universeDestroyed) {
      return;
    }

    this.preorderPropagate(this.miscTick);
    this.inputTick();
  }


  //===============================================
  // Below here be the functions related to drawing and debugging.
  //===============================================

  /**
   * Computes numbers needed for drawing functions.
   */
  computeDrawingValues(posX, posY) {
    const size = 50;
    const spacing = 40;
    const verticalSpacing = 20;

    const topX = posX - size / 2;
    const topY = posY - size / 2;
    const nextPosX = posX;
    const nextPosY = posY + size + verticalSpacing;

    return { posX, posY, size, spacing, verticalSpacing, topX, topY, nextPosX, nextPosY };
  }

  /**
   * Caches the drawing values for this Node and its subtree.
   */
  cacheDrawingValues(posX, posY) {
    this.cachedDrawingValues = this.computeDrawingValues(posX, posY);
    const { size, spacing } = this.cachedDrawingValues;
    let { nextPosX, nextPosY } = this.cachedDrawingValues;

    this.children.forEach((child) => {
      child.cacheDrawingValues(nextPosX, nextPosY); 
      nextPosX += child.subtreeWidth() * (size + spacing);
    });
  }

  drawConnection(stage, child, idx, colour, strokeWidth) {
    const { posX, posY } = this.cachedDrawingValues;
    const { posX: childPosX, posY: childPosY } = child.cachedDrawingValues;
    const line = new createjs.Shape();
    if (idx === 0) {
      line.graphics.setStrokeStyle(strokeWidth).beginStroke(colour).moveTo(childPosX, childPosY).lineTo(posX, posY);
    } else {
      line.graphics.setStrokeStyle(strokeWidth).beginStroke(colour).moveTo(childPosX, childPosY).bezierCurveTo(childPosX, childPosY - 50, posX + 50, posY + 50, posX, posY);
    }
    stage.addChild(line);
  }

  /**
   * Draws this node and its children.
   * @param {createjs.Stage} stage the EaselJS stage to draw on 
   * @param {number} posX the x position of this node on the stage 
   * @param {number} posY the y position of this node on the stage
   */
  draw(stage, posX, posY) {
    this.cacheDrawingValues(posX, posY);
    this.draw1(stage);
    this.draw2(stage);
    this.draw3(stage);
    stage.update();
  }

  /**
   * First drawing pass for this Node and its children.
   */
  draw1(stage) {
    const { size, topX, topY } = this.cachedDrawingValues;
    const colour = this.water > -1 ? "#00a3de" : "#695a3a";

    this.children.forEach((child, idx) => {
      // draw the line segment connecting the child to the parent node
      this.drawConnection(stage, child, idx, colour, 50);

      // draw the child recursively
      child.draw1(stage); 
    });

    // draw this Node
    const node = new createjs.Shape();
    node.graphics.beginFill(colour).drawRoundRect(topX, topY, size, size, 20);
    stage.addChild(node);
  }

  draw2(stage) {
    const { size, topX, topY } = this.cachedDrawingValues;

    this.children.forEach((child, idx) => {
      // draw the line segment connecting the child to the parent node
      if (this.snow > -1 && child.snow > -1) {
        this.drawConnection(stage, child, idx, "#ddd", 30);
      }

      // draw the child recursively
      child.draw2(stage); 
    });

    // draw this Node
    if (this.snow > -1) {
      const node = new createjs.Shape();
      node.graphics.beginFill("#ddd").drawRoundRect(topX + 10, topY, size - 20, size - 10, 15);
      stage.addChild(node);
    }
  }

  /**
   * Second drawing pass for this Node and its children.
   */
  draw3(stage) {
    const { posX, posY } = this.cachedDrawingValues;

    this.children.forEach((child) => {
      // draw the child recursively
      child.draw3(stage); 
    });

    // draw this label for this Node
    const label = new createjs.Text("", "12px sans-serif", this.isPowered() ? "yellow" : "blue");
    label.text = this.originalName + " (" + this.salmon.length + ")";
    label.x = posX;
    label.y = posY;
    stage.addChild(label);
  }

  /**
   * @returns width of the subtree attached to this Node 
   */
  subtreeWidth() {
    if (this.children.length === 0) {
      return 1;
    }

    return this.children.reduce((prev, child, idx) => {
      return prev + child.subtreeWidth();
    }, 0);
  }

  /**
   * Debug function to output the subtree of this Node to the dev console.
   */
  debugPrintSubtree(offset = 0) {
    let displayString = this.originalName.replaceAll("\n", "\\n") + " (";

    if (this.isPowered()) {
      displayString += "+p";
    }
    if (this.snow > -1) {
      displayString += "+s";
   }
    if (this.water > -1) {
      displayString += "+w";
    }
    if (this.destroyed) {
      displayString += "+X";
    }

    displayString += ", " + this.salmon.length + ")"

    console.log("・".repeat(offset) + displayString);

    this.salmon.forEach(x => {
      console.log(">(&)> '" + x.name + "', " + x.age + ", " + x.direction);
    });

    this.children.forEach((child) => {
      child.debugPrintSubtree(offset + 1);
    });
  }
}

/**
 * Parse a Homespring program into tokens.
 *  
 * @param {string} raw the raw Homespring program
 * @returns array of tokens
 */
function tokenize(raw) {
  raw = raw + " ";
  let tokens = [];
  let current = "";
  let prev = null;
  
  const chars = raw.split("");
  chars.forEach((char, idx) => {
    if (char === "\n" && prev === ".") {
      // escaped newline
      // SUBTLETY: this also delimits a token for some reason. This doesn't appear
      // to be explicit in the spec but is required for compliant behaviour.
      current = current.substring(0, current.length - 1);
      current += char;
      tokens.push(current);
      current = "";
    } else if (char === " " && prev === ".") {
      // escaped whitespace
      // remove the escaping full stop
      current = current.substring(0, current.length - 1);
      current += char
    } else if (char === "." && prev === " ") {
      // escaped full stop
      current += char;
    } else if (char === " " && idx !== chars.length - 1 && chars[idx + 1] === ".") {
      // this is space escapes a full stop, nop
    } else if (char === " " || char === "\n") {
      // token delimiter
      tokens.push(current);
      current = "";
    } else {
      current += char;
    }
    
    prev = char;
  });

  return tokens;
}

/**
 * Builds a tree of nodes from given list of tokens.
 * @param {[string]} tokens array of tokens created by `tokenize`
 */
function buildTree(tokens) {
  const root = new Node("root", null);
  let current = root;
  tokens.forEach((token, idx) => {
    // blank token moves us up the tree
    if (token === "") {
      current = current.parent;
      if (current === null) {
        homespringError("Parse error: trying to add token above root");
      }
      return;
    }

    // otherwise just add node
    current = current.addChild(token);
  });
  
  const realRoot = root.children[0];
  realRoot.parent = null;
  return realRoot;
}
