import {Graph, Kind} from './graph'

// how ids are build:
// [1 2 3]
// [4 5 6]
// [7 8 9]

type Costs = {
  [key: string]: number
}
type Parents = {
  [key: string]: string | null
}
type Processed = string[]

export interface dijkstraOutput {
  distance: number,
  path: string[] | null
}

const lowestCostNode = (costs: Costs, processed: Processed) =>
  Object
    .keys(costs)
    .reduce((lowest, node) => {
      if (lowest === null || costs[Number(node)] < costs[lowest]) {
        if (!processed.includes(node)) {
          lowest = node;
        }
      }
      return lowest;
    }, null as string | null);

const recursiveLowestChildFlow = (graph: Graph, currentNode: string, costs: Costs, parents: Parents, processed: Processed): [Costs, Parents] => {
  const cost = costs[currentNode]
  const parentCell = graph.findCellById(currentNode)
  if (parentCell && parentCell.kind === Kind.Finish) {
    const newCosts = {...costs, "finish": cost}
    const newParents = {...parents, "finish": parentCell.id}
    return [newCosts, newParents]
  } else {
    const newCostObj = {...costs}
    const newParentsObj = {...parents}
    graph.getNeighbourByParentId(currentNode).forEach(child => {
      const childCost = Graph.calcDistance(child, parentCell)
      let newCost = cost + childCost
      if (!costs[child.id] || costs[child.id] > newCost) {
        newCostObj[child.id] = newCost
        newParentsObj[child.id] = currentNode
      }
    })
    const newNode = lowestCostNode(newCostObj, processed)
    if (newNode === null) {
      return [newCostObj, newParentsObj]
    } else {
      const newProcessed = processed.concat(newNode)
      return recursiveLowestChildFlow(graph, newNode, newCostObj, newParentsObj, newProcessed);
    }
  }
}

const reduceParent = (parent: string | null, parents: Parents, optimalPath: string[], finishId: string): string[] => {
  if (!parent) {
    return optimalPath
  } else {
    const node = parent === "finish" ? finishId : parent;
    const newOptimalPath = optimalPath.concat(node)
    return reduceParent(parents[node], parents, newOptimalPath, finishId)
  }
}

export const dijkstra = async (graph: Graph): Promise<dijkstraOutput> => {
  const start = graph.findCellByKind(Kind.Start)
  const finish = graph.findCellByKind(Kind.Finish)
  if (start === undefined) {
    throw new Error("Start node not specified")
  }
  if (finish === undefined) {
    throw new Error("Finish node not specified")
  }

  const costs: Costs = {finish: Infinity};
  const parents: Parents = {finish: null}
  const processed: Processed = [start.id]

  graph.getNeighbourByParentId(start.id).forEach(child => {
    parents[child.id] = start.id
    if (child.kind === Kind.Gravel) {
      costs[child.id] = 2
    } else {
      costs[child.id] = child.cost
    }
  })
  const node = lowestCostNode(costs, processed)
  if (!node) {
    return {
      distance: costs.finish,
      path: null
    }
  }
  const [doneCosts, doneParents] = recursiveLowestChildFlow(graph, node, costs, parents, processed);

  const optimalPath = reduceParent("finish", doneParents, [], finish.id)

  optimalPath.reverse()

  return {
    distance: doneCosts.finish,
    path: optimalPath.length === 1 ? null : optimalPath
  };
}
