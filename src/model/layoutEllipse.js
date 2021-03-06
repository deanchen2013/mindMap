import {polar2cartesian} from './coordination.js'
//const---------------------------------------------------
const NODE_GAP = 50;// unit:degree
const CHILD_GAP = 200;// unit : px




//layout the whole tree , start from root 
function layout(rootId,nodeIndex){
	const root = nodeIndex[rootId];
	root.x = 0;
	root.y = 0;
	
	//the whole area is divide to 4 sector:1,2,3,4 , respectively are : sector right/left/top/bottom
	//			|
	//			s3
	//			|
	//			|
	//			|
	//--s2-------------s1-------------
	//			|
	//			|
	//			|
	//			s4
	//			|
	//
	//
	let edge = Math.ceil(root.children.length / 2);
	let sector1 = root.children.slice(0,edge);
	let sector2 = root.children.slice(edge);
	//while(true){
	//	//balance the tree, if a sector have too many , squeeze node to the next sector
	//	let changed = false;
	//	if(sector1.length > 7){
	//		let nodeId = sector1.pop();
	//		sector2.unshift(nodeId);
	//		changed = true;
	//	}
	//	if(sector2.length > 7){
	//		let nodeId = sector2.pop();
	//		sector3.unshift(nodeId);
	//		changed = true;
	//	}
	//	if(sector3.length > 5){
	//		let nodeId = sector3.pop();
	//		sector4.unshift(nodeId);
	//		changed = true;
	//	}
	//	if(!changed){
	//		break;
	//	}
	//}

	console.info('sector1:',sector1,'sector2',sector2);
	layoutNode(sector1,1,nodeIndex);
	layoutNode(sector2,2,nodeIndex);
}

/*
 * get the x coordination , by y and orbit , orbit is number , indicate the level of orbit , start from 1(means the root's children orbit)
 * */
function getXByY(y,orbit){
	const a = 200+ (orbit - 1)*200;
	const b = a*2;
	return Math.sqrt( ( 1 - (y*y)/(b*b))*(a*a));
}

function layoutNode(nodes,sectorNumber,nodeIndex){
	let wholeGap = (nodes.length - 1)*NODE_GAP;
	let highestNodeHeight = Math.round(wholeGap/2);
	for(let i = 0 ; i < nodes.length ; i++){
		//calculate ever node
		const node = nodeIndex[nodes[i]];
		const y = highestNodeHeight - i*NODE_GAP;
		const x = getXByY(y,1);
		//let {x,y} =  polar2cartesian(CHILD_GAP,degree);
		//convert to x,y, consider sector number
		switch(sectorNumber){
			case 1:{
				node.x = x;
				node.y = -y;
				node.sector = 1;
				break;
			};
			case 2:{
				node.x = -x;
				node.y = y;
				node.sector = 2;
				break;
			};
		}
		console.info(`the node ${i} in sector${sectorNumber},x:${x},y:${y},converted x:${node.x},y:${node.y}`);
		//calculate children
		if(node.children && node.children.length > 0){
			layoutChildren(node.children,sectorNumber,nodeIndex);
		}
	}
}

function layoutChildren(nodes,sectorNumber,nodeIndex){
	const parentNode = nodeIndex[nodeIndex[nodes[0]].parent];
	const node_gap = 8;// 8 degree for orbit 2
	const wholeGap = (nodes.length - 1)*node_gap;
	const highestNodeDegree = Math.round(wholeGap / 2) + parentNode.degree;
	for(let i = 0 ; i < nodes.length ; i++){
		const node = nodeIndex[nodes[i]];
		const degree = highestNodeDegree - i * node_gap;
		let {x,y} = polar2cartesian(CHILD_GAP * 2,degree);
		//convert to x,y, consider sector number
		switch(sectorNumber){
			case 1:{
				node.x = x;
				node.y = -y;
				node.sector = 1;
				node.degree = degree;
				break;
			};
			case 2:{
				node.x = -x;
				node.y = y;
				node.sector = 2;
				node.degree = degree;
				break;
			};
		}
		console.info(`the node ${i} in sector${sectorNumber},degree:${degree},x:${x},y:${y},converted x:${node.x},y:${node.y}`);
	}
}


export default layout;
