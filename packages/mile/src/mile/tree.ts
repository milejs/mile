import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { MileTree, NodeData, TreeData } from "@milejs/types";
import { invariant } from "@/lib/invariant";
import { generateId } from "@/lib/generate-id";

export class Tree implements MileTree {
  _data: TreeData;
  constructor(data: TreeData) {
    this._data = data;
  }

  get data() {
    return this._data;
  }

  updateTreeData(data: TreeData) {
    this._data = data;
  }

  findParentId(id: string, data?: TreeData) {
    if (!data) {
      data = this._data;
    }
    return Object.keys(data).find((key) => data[key]?.children?.includes(id));
  }

  getParentId(id: string, data?: TreeData) {
    const parentId = this.findParentId(id, data);
    invariant(parentId, "Parent id not found");
    return parentId;
  }

  // NOTE: logic is identical to moveRow except the if condition that checks whether drop node is the parent
  moveNode(dragId: string, dropId: string, closestEdgeOfDrop: Edge | null) {
    const dragNode = this.find(dragId);
    const dropNode = this.find(dropId);
    console.log("moveNode", dragId, dragNode, dropId, dropNode);
    invariant(dragNode && dropNode);

    let mode = closestEdgeOfDrop === "bottom" ? "after" : "before";
    if (dropNode.type === "row" || dropNode.type === "column") {
      // dropping leaf node on row or column means adding the node to their children
      if (dropNode.children && dropNode.children.length > 0) {
        // if the drop node has children, decide the insertion mode based on the closest edge
        mode = closestEdgeOfDrop === "bottom" ? "last-child" : "first-child";
      } else {
        mode = "last-child"; // doesn't matter last-child or first-child
      }
    }

    // get parent for revuse action
    const prevDragParentId = this.getParentId(dragNode.id);
    const prevDragParent = this.get(prevDragParentId);
    const prevDropParentId = this.getParentId(dropNode.id);
    const prevDropParent = this.get(prevDropParentId);

    let result = this.removeIdFromParent(this._data, dragNode.id);
    result = this.insertAt(result, dropId, mode, dragNode);

    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    // new drop node is the previous drag node
    invariant(prevDragParent.children);
    let prevIdx = prevDragParent.children.indexOf(dragNode.id);
    let currentDragParent = result[prevDragParent.id];
    let newDropNode = currentDragParent?.children?.[prevIdx];
    // empty new drop node means it was dragged away and nothing is there anymore so we will use parent as a drop node instead
    let newDropNodeId = newDropNode == null ? prevDragParent.id : newDropNode;

    // new drag node is the previous drop node
    let newDragNodeId: string | undefined;
    if (dropNode.type === "row" || dropNode.type === "column") {
      const currentDropParent = result[dropNode.id]; // row or column
      invariant(currentDropParent?.children);
      const wasLastChild = closestEdgeOfDrop === "bottom";
      const firstOrLast = wasLastChild
        ? currentDropParent.children.length - 1
        : 0;
      newDragNodeId = currentDropParent.children[firstOrLast];
    } else {
      // if prev drop node is not row or column,
      // we need to find where it is currently to be used for new drag node
      let currentDropParent = result[prevDropParent.id];
      invariant(currentDropParent?.children);
      let idx = currentDropParent.children.indexOf(dropNode.id);
      const wasGoingAfter = closestEdgeOfDrop === "bottom";
      const actualIndex = wasGoingAfter ? idx + 1 : idx - 1;
      newDragNodeId = currentDropParent.children[actualIndex];
    }

    return {
      data: result,
      reverseAction: {
        type: "moveNode",
        name: "Move node",
        payload: {
          dragId: newDragNodeId,
          dropId: newDropNodeId,
          closestEdgeOfDrop: "top",
        },
      },
    };
  }

  // NOTE: logic is identical to moveNode except the if condition that checks whether drop node is the parent
  moveRow(dragId: string, dropId: string, closestEdgeOfDrop: Edge | null) {
    const dragNode = this.find(dragId);
    const dropNode = this.find(dropId);
    console.log("moveRow", dragId, dragNode, dropId, dropNode);
    invariant(dragNode && dropNode);

    let mode = closestEdgeOfDrop === "bottom" ? "after" : "before";
    if (dropNode.type === "section") {
      // dropping leaf node on row or column means adding the node to their children
      if (dropNode.children && dropNode.children.length > 0) {
        // if the drop node has children, decide the insertion mode based on the closest edge
        mode = closestEdgeOfDrop === "bottom" ? "last-child" : "first-child";
      } else {
        mode = "last-child"; // doesn't matter last-child or first-child
      }
    }

    // get parent for revuse action
    const prevDragParentId = this.getParentId(dragNode.id);
    const prevDragParent = this.get(prevDragParentId);
    const prevDropParentId = this.getParentId(dropNode.id);
    const prevDropParent = this.get(prevDropParentId);

    let result = this.removeIdFromParent(this._data, dragNode.id);
    result = this.insertAt(result, dropId, mode, dragNode);

    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    // new drop node is the previous drag node
    invariant(prevDragParent.children);
    let prevIdx = prevDragParent.children.indexOf(dragNode.id);
    let currentDragParent = result[prevDragParent.id];
    let newDropNode = currentDragParent?.children?.[prevIdx];
    // empty new drop node means it was dragged away and nothing is there anymore so we will use parent as a drop node instead
    let newDropNodeId = newDropNode == null ? prevDragParent.id : newDropNode;

    // new drag node is the previous drop node
    let newDragNodeId: string | undefined;
    if (dropNode.type === "section") {
      const currentDropParent = result[dropNode.id]; // row or column
      invariant(currentDropParent?.children);
      const wasLastChild = closestEdgeOfDrop === "bottom";
      const firstOrLast = wasLastChild
        ? currentDropParent.children.length - 1
        : 0;
      newDragNodeId = currentDropParent.children[firstOrLast];
    } else {
      // if prev drop node is not row or column,
      // we need to find where it is currently to be used for new drag node
      let currentDropParent = result[prevDropParent.id];
      invariant(currentDropParent?.children);
      let idx = currentDropParent.children.indexOf(dropNode.id);
      const wasGoingAfter = closestEdgeOfDrop === "bottom";
      const actualIndex = wasGoingAfter ? idx + 1 : idx - 1;
      newDragNodeId = currentDropParent.children[actualIndex];
    }

    return {
      data: result,
      reverseAction: {
        type: "moveRow",
        name: "Move row",
        payload: {
          dragId: newDragNodeId,
          dropId: newDropNodeId,
          closestEdgeOfDrop: "top",
        },
      },
    };
  }

  reorderSection(
    dragId: string,
    dropId: string,
    closestEdgeOfDrop: Edge | null,
  ) {
    const dragNode = this.find(dragId);
    const dropNode = this.find(dropId);
    invariant(
      dragNode && dropNode && dropNode.type === "section",
      "reorder section fail: drop node is not a section",
    );
    const parentId = this.getParentId(dragNode.id);
    const parentId2 = this.getParentId(dropNode.id);
    invariant(
      parentId === parentId2,
      "reorder section fail: drag and drop node have different parent",
    );
    const commonParent = this.get(parentId);
    const prevDragIndex = commonParent.children?.indexOf(dragNode.id);
    const prevDropIndex = commonParent.children?.indexOf(dropNode.id);
    invariant(prevDragIndex != null && prevDropIndex != null);
    let mode = closestEdgeOfDrop === "bottom" ? "after" : "before";
    let result = this.removeIdFromParent(this._data, dragNode.id);
    result = this.insertAt(result, dropId, mode, dragNode);

    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    // const parent = this.findParentId(dragNode.id)
    // const commonParent = this.get(dragNode.parent?.id);
    const currentCommonParent = this.get(parentId);
    invariant(currentCommonParent.children);
    const actualPrevDropIndex = getReorderDestinationIndex({
      startIndex: prevDragIndex,
      indexOfTarget: prevDropIndex,
      closestEdgeOfTarget: closestEdgeOfDrop,
      axis: "vertical",
    });
    const newDragNodeId = currentCommonParent.children[actualPrevDropIndex];
    const newDropNodeId = currentCommonParent.children[prevDragIndex];
    const wasMovingForward = prevDragIndex < prevDropIndex;

    return {
      data: result,
      reverseAction: {
        type: "reorderSection",
        name: "Reorder section",
        payload: {
          dragId: newDragNodeId,
          dropId: newDropNodeId,
          closestEdgeOfDrop: wasMovingForward ? "top" : "bottom",
        },
      },
    };
  }

  reorderNode(dragId: string, dropId: string, closestEdgeOfDrop: Edge | null) {
    const dragNode = this.find(dragId);
    const dropNode = this.find(dropId);
    invariant(
      dragNode && dropNode,
      "reorder section fail: drag and drop node are not found",
    );
    const parentId = this.getParentId(dragNode.id);
    const parentId2 = this.getParentId(dropNode.id);
    invariant(
      parentId === parentId2,
      "reorder section fail: drag and drop node have different parent",
    );
    const commonParent = this.get(parentId);
    const prevDragIndex = commonParent.children?.indexOf(dragNode.id);
    const prevDropIndex = commonParent.children?.indexOf(dropNode.id);
    invariant(prevDragIndex != null && prevDropIndex != null);
    let mode = closestEdgeOfDrop === "bottom" ? "after" : "before";
    let result = this.removeIdFromParent(this._data, dragNode.id);
    result = this.insertAt(result, dropId, mode, dragNode);

    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    // const parent = this.findParentId(dragNode.id)
    // const commonParent = this.get(dragNode.parent?.id);
    const currentCommonParent = this.get(parentId);
    invariant(currentCommonParent.children);
    const actualPrevDropIndex = getReorderDestinationIndex({
      startIndex: prevDragIndex,
      indexOfTarget: prevDropIndex,
      closestEdgeOfTarget: closestEdgeOfDrop,
      axis: "vertical",
    });
    const newDragNodeId = currentCommonParent.children[actualPrevDropIndex];
    const newDropNodeId = currentCommonParent.children[prevDragIndex];
    const wasMovingForward = prevDragIndex < prevDropIndex;

    return {
      data: result,
      reverseAction: {
        type: "reorderSection",
        name: "Reorder section",
        payload: {
          dragId: newDragNodeId,
          dropId: newDropNodeId,
          closestEdgeOfDrop: wasMovingForward ? "top" : "bottom",
        },
      },
    };
  }

  /**
   * duplicateNode inserts new node after the provided node id and add all node data to the tree
   * @param id - id of node that we will duplicate
   * @param newNodeId - id of new node (must be unique) that will be inserted after the `id`
   * @param nodes - all nodes data that we must add to the flat tree. containing the duplicated node and all its children.
   */
  duplicateNode(
    id: string,
    newNodeId: string,
    nodes: Record<string, NodeData>,
  ) {
    const dupNode = nodes[newNodeId];
    invariant(dupNode);
    let result = this.insertAt(this._data, id, "after", dupNode);
    result = { ...result, ...nodes };

    // refresh the world
    this.updateTreeData(result);
    // compute reverse action ------------------------------------------
    return {
      data: result,
      id: newNodeId,
      reverseAction: {
        type: "deleteDuplicatedNode",
        name: "Delete duplicated node",
        payload: {
          id: newNodeId,
          prevNodeId: id,
        },
      },
    };
  }

  deleteDuplicatedNode(id: string, prevNodeId?: string) {
    const node = this.get(id);
    const { result, nodes } = this.removeNodeAndChildren(this._data, id);

    // refresh the world
    this.updateTreeData(result);
    // compute reverse action ------------------------------------------
    return {
      data: result,
      id: node.id,
      reverseAction: {
        type: "duplicateNode",
        name: "Duplicate node",
        payload: {
          id: prevNodeId,
          newId: id,
          nodes,
        },
      },
    };
  }

  addNode(
    id: string,
    nodeId: string,
    nodes: Record<string, NodeData>,
    mode = "after",
  ) {
    const nodeData = nodes[nodeId];
    invariant(nodeData);
    let result = this.insertAt(this._data, id, mode, nodeData);
    // add all nodes to data
    result = { ...result, ...nodes };

    // refresh the world
    this.updateTreeData(result);
    // compute reverse action ------------------------------------------
    return {
      data: result,
      id: nodeData.id,
      reverseAction: {
        type: "deleteNode",
        name: "Delete node",
        payload: {
          id: nodeData.id,
          prevNodeId: id,
        },
      },
    };
  }

  deleteNode(id: string) {
    const parentId = this.getParentId(id);
    const parent = this.get(parentId);
    const nodeIndex = parent.children?.indexOf(id);

    const { result, nodes } = this.removeNodeAndChildren(this._data, id);

    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    invariant(parent.children);
    invariant(nodeIndex != null);

    let targetId: string;
    let mode: string;
    if (nodeIndex === 0) {
      // if we delete the 1st child, the reverse is to add the first child to parent
      targetId = parent.id;
      mode = "first-child";
    } else {
      // otherwise, the reverse is to add node back after the before node
      const targetNodeId = parent.children[nodeIndex - 1];
      invariant(targetNodeId);
      targetId = targetNodeId;
      mode = "after";
    }

    return {
      data: result,
      id,
      reverseAction: {
        type: "addNode",
        name: "Add node",
        payload: {
          id: targetId,
          nodeId: id,
          mode,
          nodes,
        },
      },
    };
  }

  // impl of insertNewElement/ deleteNewElement is basically the same as addNode/ deleteNode except
  // we must delete the 'id' node if it's a component stub (this is when you insert new node from an empty stub component node)
  // and the corresponding reverse action
  insertNewElement(
    id: string,
    type: string,
    mode: string,
    nodeId: string,
    nodes: Record<string, NodeData>,
  ) {
    const nodeData = nodes[nodeId];
    invariant(nodeData);
    let result = this.insertAt(this._data, id, mode, nodeData);
    // add all nodes to data
    result = { ...result, ...nodes };

    // delete 'id' node if it's a "component" stub
    let previousNode = this.get(id);
    if (previousNode.type === "component") {
      result = this.removeNode(result, id);
    }

    // refresh the world
    this.updateTreeData(result);
    // compute reverse action ------------------------------------------
    return {
      data: result,
      id: nodeData.id,
      reverseAction: {
        type: "deleteNewElement",
        name: "Delete element",
        payload: {
          id: nodeData.id,
          type,
          insertPrevious:
            previousNode.type === "component" ? previousNode : undefined,
        },
      },
    };
  }

  deleteNewElement(
    id: string,
    type: string,
    insertPrevious?: NodeData | undefined,
  ) {
    const parentId = this.getParentId(id);
    const parent = this.get(parentId);
    const nodeIndex = parent.children?.indexOf(id);
    invariant(parent.children);
    invariant(nodeIndex != null);

    let { result, nodes } = this.removeNodeAndChildren(this._data, id);

    // insert the empty stub component if defined
    if (insertPrevious != null) {
      let updateParent = this.get(parentId, result);
      invariant(updateParent.children);
      if (nodeIndex === 0) {
        result = this.insertAt(result, parentId, "first-child", insertPrevious);
      } else {
        const targetNodeId = updateParent.children[nodeIndex - 1];
        invariant(targetNodeId);
        result = this.insertAt(result, targetNodeId, "after", insertPrevious);
      }
    }

    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    let targetId: string;
    let mode: string;
    if (nodeIndex === 0) {
      // if we delete the 1st child, the reverse is to add the first-child to parent
      targetId = parent.id;
      mode = "first-child";
    } else {
      // otherwise, the reverse is to add node back after the before node
      const targetNodeId = parent.children[nodeIndex - 1];
      invariant(targetNodeId);
      targetId = targetNodeId;
      mode = "after";
    }

    return {
      data: result,
      id,
      reverseAction: {
        type: "insertNewElement",
        name: "Insert element",
        payload: {
          id: targetId,
          type,
          mode,
          nodeId: id,
          nodes,
        },
      },
    };
  }

  updateNodeOption(nodeId: string, value: any, initialValue?: any) {
    const node = this.get(nodeId);
    const newData = {
      ...node,
      options: value,
    };
    let result = this.updateAt(this._data, node.id, newData);
    // refresh the world
    this.updateTreeData(result);

    // compute reverse action ------------------------------------------
    return {
      data: result,
      reverseAction: {
        type: "updateNodeOption",
        name: `Update node option`,
        payload: {
          nodeId,
          value: initialValue,
        },
      },
    };
  }

  find(id: string, data: TreeData = this._data): NodeData | null {
    if (id === "root") return data.root ?? null;
    if (data[id] != null) {
      return data[id];
    }
    return null;
  }

  get(id: string, data: TreeData = this._data) {
    const node = this.find(id, data);
    invariant(node, "node not found");
    return node;
  }

  // helpers
  findDescendantNodes(id: string) {
    const node = this.get(id);
    // TODO: check if we have to check for node.children empty array
    if (!node.children) {
      return { [id]: node };
    }
    let bag: Record<string, NodeData> = {};
    if (node.type !== "text-node") {
      for (const childId of node.children) {
        const childBag = this.findDescendantNodes(childId);
        bag = { ...bag, ...childBag };
      }
    }
    bag[id] = node;
    return bag;
  }

  duplicateNodeData(id: string) {
    let nodes: Record<string, NodeData> = {};
    const node = this.get(id);
    let dupId = generateId();
    let dupNode = { ...node, id: dupId };
    if (dupNode.type !== "text-node") {
      invariant(dupNode.children);
      let temp = [];
      for (const childId of dupNode.children) {
        let o = this.duplicateNodeData(childId);
        nodes = { ...nodes, ...o.nodes };
        temp.push(o.newNodeId);
      }
      dupNode.children = temp;
    }
    nodes[dupId] = dupNode;

    return { newNodeId: dupId, nodes };
  }

  /************************************************************************
   * Private methods
   ***********************************************************************/

  private updateAt(
    data: TreeData,
    targetId: string,
    nodeData: NodeData,
  ): TreeData {
    return {
      ...data,
      [targetId]: nodeData,
    };
  }

  private insertAt(
    data: TreeData,
    dropId: string,
    mode: string,
    nodeData: NodeData,
  ): TreeData {
    // Ensure target parent exists in data
    if (!data[dropId]) {
      throw new Error(`Parent with ID '${dropId}' not found`);
    }

    let parentId: string; // this is a parent
    let updatedChildren: string[];

    if (mode === "after" || mode === "before") {
      // mode: "after" | "before", find a parent
      parentId = this.getParentId(dropId, data);
      const parent = this.get(parentId, data);
      invariant(parent.children);
      updatedChildren = parent.children.flatMap((id) => {
        if (id === dropId) {
          if (mode === "after") {
            return [id, nodeData.id];
          } else if (mode === "before") {
            return [nodeData.id, id];
          }
        }
        return id;
      });
    } else {
      // mode: "last-child" | "first-child"
      parentId = dropId;
      const parent = this.get(parentId, data);
      invariant(parent.children);
      updatedChildren =
        mode === "last-child"
          ? [...parent.children, nodeData.id]
          : [nodeData.id, ...parent.children];
    }

    return {
      ...data,
      [parentId]: {
        ...data[parentId],
        children: updatedChildren,
      },
      [nodeData.id]: nodeData, // Add the new node to the data
    };
  }

  private removeIdFromParent(data: TreeData, id: string): TreeData {
    // find parent and remove this node from its children
    // Find the parent containing the childId in its children array
    const parentId = this.findParentId(id, data);

    // If no parent is found, return the original data unchanged
    if (!parentId) return data;

    // Return the new data with the child removed from the parent's children
    return {
      ...data,
      [parentId]: {
        ...data[parentId],
        children: data[parentId]?.children?.filter(
          (childId: string) => childId !== id,
        ),
      },
    };
  }

  private removeNode(data: TreeData, id: string): TreeData {
    // find parent and remove this node from its children
    // Find the parent containing the childId in its children array
    const result = this.removeIdFromParent(data, id);
    const { [id]: _, ...rest } = result;
    return rest;
  }

  /**
   * Remove node and all its children. Returns the result data and all nodes that were just removed
   */
  private removeNodeAndChildren(data: TreeData, id: string) {
    // find all descendants
    const descendants = this.findDescendantNodes(id);
    // remove id from parent
    let result = this.removeIdFromParent(data, id);
    // remove all descendants from the data
    const deleteKeys = Object.keys(descendants);
    result = Object.fromEntries(
      Object.entries(result).filter(([key]) => !deleteKeys.includes(key)),
    );
    return { result, nodes: descendants };
  }
}

// helpers
function getReorderDestinationIndex({
  startIndex,
  closestEdgeOfTarget,
  indexOfTarget,
  axis,
}: {
  startIndex: number;
  closestEdgeOfTarget: Edge | null;
  indexOfTarget: number;
  axis: "vertical" | "horizontal";
}): number {
  // invalid index's
  if (startIndex === -1 || indexOfTarget === -1) {
    return startIndex;
  }

  // if we are targeting the same index we don't need to do anything
  if (startIndex === indexOfTarget) {
    return startIndex;
  }

  if (closestEdgeOfTarget == null) {
    return indexOfTarget;
  }

  const isGoingAfter: boolean =
    (axis === "vertical" && closestEdgeOfTarget === "bottom") ||
    (axis === "horizontal" && closestEdgeOfTarget === "right");

  const isMovingForward: boolean = startIndex < indexOfTarget;
  // moving forward
  if (isMovingForward) {
    return isGoingAfter ? indexOfTarget : indexOfTarget - 1;
  }
  // moving backwards
  return isGoingAfter ? indexOfTarget + 1 : indexOfTarget;
}
