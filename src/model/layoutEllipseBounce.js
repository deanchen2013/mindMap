//@flow
import {polar2cartesian} from './coordination.js'
import {type Node,type NodeMap,getNextId} from './MindMapModel.js'
//const---------------------------------------------------
const NODE_GAP = 50;// unit:degree
export const CHILD_GAP = 200;// unit : px
const MAX_DEGREE = 45;//unit : degree , the max degree to ajust the ellipse shape.
//const MAX_HEIGHT = Math.sin(Math.PI * MAX_DEGREE / 180) * CHILD_GAP;
//const MAX_X = Math.cos(Math.PI * MAX_DEGREE / 180 ) * CHILD_GAP;
const MIN_X = 160;//the root child cannot less than this distance;
const ORIGINAL_RATIO = 0.6;//the original ratio of ellipse ratio = b/a;

const ERROR = {
	RATIO_IS_TOO_SMALL : ' ratio is too small',
	LAYOUT_FAILURE : 'layout failure!',
}

function getOrbitMinX(orbit){
	return orbit * CHILD_GAP * 0.6;
}



//layout the whole tree , start from root 
var sector1;
var sector2;
function layout(rootId : number ,nodeIndex :NodeMap){
	const root = nodeIndex[rootId];
	root.x = 0;
	root.y = 0;


	//every time to layout , reset the basic nodes;
	//every time to layout , first ,delete the virtual node
	for(let k in nodeIndex){
		if(nodeIndex[parseInt(k)].name === '虚拟节点' ){
			let parentNode = nodeIndex[parseInt(nodeIndex[parseInt(k)].parent)];
			parentNode.children = parentNode.children?parentNode.children.filter(n => n != parseInt(k))  : [];
			delete nodeIndex[parseInt(k)];
		}
	}
	resetRatio();

	
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
	let children = root.children ? root.children : [];
	let edge = Math.ceil(children.length / 2 );
	sector1 = children.slice(0,edge);
	sector2 = children.slice(edge);
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
	//check the children occupy space 
	let count = 0;	
	while(true){
		try{
			layoutNode(sector1,1,nodeIndex);
			layoutNode(sector2,2,nodeIndex);
			if(checkSpaceOccupy(nodeIndex) && checkRatio(nodeIndex)){
				break;
			}
			if(count++ > 100){
				console.log('too many loop!');
				break;
			}
		}catch(e){
			if(e.message == ERROR.RATIO_IS_TOO_SMALL){
				console.warn('ratio is too small ,inscreas ratio...',e);
				increaseRatio();
				continue;
			}else{
				console.error(e);
				throw new Error(ERROR.LAYOUT_FAILURE);
			}
		}
	}
}

/*
 * get the x coordination , by y and orbit , orbit is number , indicate the level of orbit , start from 1(means the root's children orbit)
 * */
function getXByY(y,orbit,ratio){
	const a = CHILD_GAP + (orbit - 1)*CHILD_GAP;
	const b = a*ratio;
	let x = Math.sqrt( ( 1 - (y*y)/(b*b))*(a*a));
	if(isNaN(x)){
		throw new Error('x is NaN');
	}
	return x;
}

function increaseRatio(){
	rootRatio += 0.1;
}
function resetRatio(){
	rootRatio = ORIGINAL_RATIO;
}
function calculateRatio(hiestNodeHeight){
	//according y , cal x, if x < MIN_X then , adjest the ratio
	const x = getXByY(hiestNodeHeight,1,rootRatio);
	if(x > MIN_X ){
		//return rootRatio;
		//do nothing 
	}else{
		rootRatio =  hiestNodeHeight / Math.sqrt(CHILD_GAP*CHILD_GAP - MIN_X*MIN_X);
	}
}

//the leve 1 ratio,it deside the whole mindMap shape (the ratio of the ellipse)
var rootRatio = ORIGINAL_RATIO;
function getRootRatio(){
	return rootRatio;
}
//the middle line original point is the start point of the middle line
function getB( sign : number){
	if(rootRatio <= 1){
		//the nodes is not so many , no need to adjest the point
		return 0;
	}else{
		//stretch the ellipse to lay out more node, adjest the point
		return  (CHILD_GAP * rootRatio - CHILD_GAP) * sign; // the point = b - a 
	}
}


function layoutNode(nodes,sectorNumber,nodeIndex){
	let wholeGap = (nodes.length - 1)*NODE_GAP;
	let highestNodeHeight = Math.round(wholeGap/2);
	if(highestNodeHeight > CHILD_GAP*rootRatio){
		//impossible
		throw new Error(ERROR.RATIO_IS_TOO_SMALL);
	}
	//calculateRatio(highestNodeHeight);
	for(let i = 0 ; i < nodes.length ; i++){
		//calculate ever node
		const node = nodeIndex[nodes[i]];
		const y = highestNodeHeight - i*NODE_GAP;
		const x = getXByY(y,1,rootRatio);
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
		console.info(`the node ${node.id} in sector${sectorNumber},x:${x},y:${y},converted x:${+node.x},y:${+node.y}`);
		//calculate children
		if(node.children && node.children.length > 0){
			layoutChildren(node.children,nodeIndex);
		}
	}
}

/*
 * get the middle point cooridnation , its the intersection of the two : the line pass (B,0) and parent (x1,y1), and the ellipse orbit
 * the line equation : y = kx + d  (pass (x1,y1) and (B,0))
 * the ellipse : x**2 / a**2 + y**2 / b**2 = 1 ( b = a * R)
 * the result : ( by the formular of quadratic equation with on unknown)
 * x2 =  (2*B*(y1**2) +/- Math.sqrt( 4*(B**2)*(y1**4) - 4*( ((x1 + B)**2)*(R**2) + y1**2 )*(y1**2 * B**2 - a**2 * R**2 * ( x1 + B)**2 ) ) ) / 2 * ( (x1 + B)**2 * R**2 + y1**2 ) 
 * y2 = (y1*x2 - y1*B) / (x1+B)	
 * */
function getMiddlePoint(a : number,ratio :number,B :number,parentX : number,parentY : number){
	const x1 = parentX;
	const y1 = parentY;
	const R = ratio;
	const xFomular = ( sign ) =>  (2*B*(y1**2) + sign * Math.sqrt( 4*(B**2)*(y1**4) - 4*( ((x1 - B)**2)*(R**2) + y1**2 )*(y1**2 * B**2 - a**2 * R**2 * ( x1 - B)**2 ) ) ) / ( 2 * ( (x1 - B)**2 * R**2 + y1**2 )) ;
	const yFomular = (x2) =>(y1*x2 - y1*B) / (x1 - B);
	let x2 = xFomular( 1 );
	let y2 = yFomular(x2);
	let result = {};
	result.positive = {
		x : x2,
		y : y2,
	}
	x2  = xFomular( -1 );
	y2 = yFomular(x2);
	result.negtive = {
		x : x2,
		y : y2,
	}
	console.info(`with condition : a=${a} ,ratio=${ratio} , (x1,y1) = (${parentX},${parentY}) , (B,0) = (${B},0) ,get result :`,result);
	return result;
}

function layoutChildren(nodes,nodeIndex){
	const parentNode = nodeIndex[parseInt(nodeIndex[nodes[0]].parent)];
	const parentNodeX = parseFloat(parentNode.x);
	const parentNodeY = parseFloat(parentNode.y);
	const orbit = parentNode.level; 
	//calculate the middle point of child nodes. its in a strait line with parent point and root point (3 point in a line )
	const a = CHILD_GAP + (orbit - 1)*CHILD_GAP;
	//const middlePointY = a / Math.sqrt( rootRatio * rootRatio + ((parentNode.x*parentNode.x)/(parentNode.y*parentNode.y))) ;
	//const middlePointX = getXByY(middlePointY,2,rootRatio);//TODO temp 2 level
	const B = getB( parentNodeX >= 0 ? -1 : 1); 
	
	const result = getMiddlePoint(a,rootRatio,B,parentNodeX,parentNodeY);
	const middlePointX = parentNodeX >= 0 ? result.positive.x : result.negtive.x;
	const middlePointY = parentNodeX >= 0 ? result.positive.y : result.negtive.y;

	//calculate the every node gap 
	const wholeGap = (nodes.length - 1)*NODE_GAP;
	const highestNodeHeight = middlePointY - Math.round(wholeGap / 2);
	if(Math.abs(highestNodeHeight) > a*rootRatio || Math.abs(highestNodeHeight+wholeGap) > a*rootRatio){
		//impossible
		throw new Error(ERROR.RATIO_IS_TOO_SMALL);
	}
	parentNode.childrenSpace = undefined;
	for(let i = 0 ; i < nodes.length ; i++){
		const node = nodeIndex[nodes[i]];
		node.y = highestNodeHeight + i*NODE_GAP;
		node.x = (parentNodeX >= 0 ? 1 : -1) * getXByY(node.y,orbit,rootRatio);
		console.info(`the node ${node.id}(child ${i} of parent) ,x:${+node.x},y:${+node.y},and the highestNodeHeight:${highestNodeHeight},the middle point (x,y):(${middlePointX},${middlePointY})`);
		//update the children y occupy space (the node's children highest and lowest range
		if(parentNode.childrenSpace	== undefined ){
			parentNode.childrenSpace = {
				highest : node.y,
				lowest : node.y,
			}
		}else{
			if(parentNode.childrenSpace.highest > node.y){
				parentNode.childrenSpace.highest = node.y;
			}
			if(parentNode.childrenSpace.lowest < node.y){
				parentNode.childrenSpace.lowest = node.y;
			}
		}
		//calculate children
		if(node.children && node.children.length > 0){
			layoutChildren(node.children,nodeIndex);
		}
	}
}


function checkSpaceOccupyOld(nodes,nodeIndex){
	for(let i = 0 ;i < nodes.length ; i++){
		const node1 = nodeIndex[nodes[i]];
		if(i+1 <= nodes.length){
			for (let j = i+1; j < nodes.length ; j++){
				const node2 = nodeIndex[nodes[j]];
				if(node1.childrenSpace && node2.childrenSpace && node1.childrenSpace.lowest + 30 > node2.childrenSpace.highest ){//TODO 50
					console.info(`the node:${node1.id} overlap with node:${node2.id}`,node1,node2);
					const parentNode = nodeIndex[node1.parent];
					const newNode = 
						{
							id: getNextId(nodeIndex),
							name:'虚拟节点',
							color : '#94D2B3',
							showChildren : false,
							parent : parentNode.id,
							level : parentNode.level + 1,
						};
					parentNode.children = [...nodes.slice(0,i+1),newNode.id,...nodes.slice(i+1)];
					nodeIndex[newNode.id] = newNode;
					return false;
				}
			}
		}
		//recurser
		if(node1.children){
			if(!checkSpaceOccupyOld(node1.children,nodeIndex)){
				return false;
			}
		}
	}
	return true;
}

function checkSpaceOccupy(nodeIndex){
	for(let key in nodeIndex){
		const node = nodeIndex[parseInt(key)];
		//get all the nodes : at the same orbit , at the same sector
		const brothers = getBrothers(node,nodeIndex);
		for(let i = 0 ; i < brothers.length ; i++){
			const bro = brothers[i];
			if(node.childrenSpace && bro.childrenSpace && 
				((node.childrenSpace.lowest + 30 > bro.childrenSpace.highest && node.childrenSpace.highest - 30 < bro.childrenSpace.highest) 
				||
				(node.childrenSpace.lowest + 30 > bro.childrenSpace.lowest && node.childrenSpace.highest - 30 < bro.childrenSpace.lowest) 
				)){
				//overlap ,insert a virtual node ;
				console.info(`the node:${node.id} overlap (down side) with node:${bro.id}`,node,bro);
				const parentNode = nodeIndex[parseInt(node.parent)];
				const newNode = 
					{
						id: getNextId(nodeIndex),
						name:'虚拟节点',
						color : '#94D2B3',
						showChildren : false,
						parent : parentNode.id,
						level : parentNode.level + 1,
						children : [],
						x : 0,
						y : 0,
					};
				if(parseFloat(node.y) > parseFloat(bro.y)){
					if(parseInt(node.x) > 0){
						//insert uper itself
						const i = parentNode.children.indexOf(node.id);
						const nodes = parentNode.children;
						parentNode.children = [...nodes.slice(0,i),newNode.id,...nodes.slice(i)];
						nodeIndex[newNode.id] = newNode;
						//if parent is root , update the sector array
						if(parentNode.level == 1 ){
							const j = sector1.indexOf(node.id);
							sector1 = [...sector1.slice(0,j),newNode.id,...sector1.slice(j)];
						}
						return false;
					}else{
						//insert uper itself
						const i = parentNode.children.indexOf(node.id);
						const nodes = parentNode.children;
						parentNode.children = [...nodes.slice(0,i+1),newNode.id,...nodes.slice(i+1)];
						nodeIndex[newNode.id] = newNode;
						//if parent is root , update the sector array
						if(parentNode.level == 1 ){
							const j = sector2.indexOf(node.id);
							sector2 = [...sector2.slice(0,j+1),newNode.id,...sector2.slice(j+1)];
						}
						return false;
					}
				}else{
					if(node.x > 0){
						//insert uper itself
						const i = parentNode.children.indexOf(node.id);
						const nodes = parentNode.children;
						parentNode.children = [...nodes.slice(0,i+1),newNode.id,...nodes.slice(i+1)];
						nodeIndex[newNode.id] = newNode;
						//if parent is root , update the sector array
						if(parentNode.level == 1 ){
							const j = sector1.indexOf(node.id);
							sector1 = [...sector1.slice(0,j+1),newNode.id,...sector1.slice(j+1)];
						}
						return false;
					}else{
						//insert uper itself
						const i = parentNode.children.indexOf(node.id);
						const nodes = parentNode.children;
						parentNode.children = [...nodes.slice(0,i),newNode.id,...nodes.slice(i)];
						nodeIndex[newNode.id] = newNode;
						//if parent is root , update the sector array
						if(parentNode.level == 1 ){
							const j = sector2.indexOf(node.id);
							sector2 = [...sector2.slice(0,j),newNode.id,...sector2.slice(j)];
						}
						return false;
					}
				}
			}
		};
	}
	return true;
}

/*
 * get the nodes : at the same orbit , and the same sector( x sign is the same)
 * */
function getBrothers(node,nodeIndex) : Array<Node>{
	let brothers = [];
	for(let key in nodeIndex){
		if(parseInt(key )== node.id){
			//pass the node itself
			continue;
		}
		const currentNode = nodeIndex[parseInt(key)];
		if(currentNode.level == 1){
			//pass the root
			continue;
		}
		if(currentNode.level == node.level && currentNode.x * node.x > 0){
			brothers.push(currentNode);
		}
	}
	return brothers;
}

/*
 * check the ratio is OK, that means the childrens x is not too close to the parent(orbit)
 * */
function checkRatioOld(nodes,nodeIndex){
	let orbit = 0;
	let minX = 99999;
	let parentNode = undefined;
	for(let i = 0 ;i < nodes.length ; i++){
		const node = nodeIndex[nodes[i]];
		parentNode = nodeIndex[node.parent];
		orbit = node.level -1;
		if(Math.abs(node.x) < minX){
			minX = Math.abs(node.x);
		}
		if(node.children){
			if(!checkRatio(node.children)){
				return false;
			}
		}
	}
	const orbitMinX = getOrbitMinX(orbit);
	if(minX < orbitMinX){
		//too close,adjest the ratio
		increaseRatio();
		console.info(`too close to parent orbit,minX:${minX},orbitMinX:${orbitMinX},adjested ratio:${rootRatio}`);
		return false;
	}else{
		return true;
	}
}
/*
 * check the ratio is OK, that means the childrens x is not too close to the parent(orbit)
 * */
function checkRatio(nodeIndex){
	for(let key in nodeIndex){
		const node = nodeIndex[parseInt(key)];
		if(node.level == 1){
			//pass the root
			continue;
		}
		const orbit = node.level -1;
		const orbitMinX = getOrbitMinX(orbit);
		const parentNode = nodeIndex[parseInt(node.parent)];
		if(Math.abs(node.x) < orbitMinX){
			//too close,adjest the ratio
			increaseRatio();
			console.info(`too close to parent orbit,x:${node.x},orbitMinX:${orbitMinX},adjested ratio:${rootRatio}`);
			return false;
		}
	}
	return true;
}

export default layout;
export {getRootRatio,getB};
