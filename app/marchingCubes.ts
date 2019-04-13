import caseTable from './caseTable';
import { normalize } from './utils/normalize';



type input = { dims:{x:number,y:number,z:number}, scalars:number[], perfusionImage:number[]};



type output = { p : number[], n : number[], perfusionNormals:any[], perfusionPoints:any[] };



type requestData = (input:input) => output;



const model = {
  computeNormals:true, 
  mergePoints:true, 
  contourValue:1
};



const CASE_MASK = [1, 2, 4, 8, 16, 32, 64, 128];



const VERT_MAP = [0, 1, 3, 2, 4, 5, 7, 6];



export const marchingCubes = () : requestData => {

  let ids = [];
  let voxelScalars = [];
  let voxelGradients = [];
  let voxelPts = [];
  let edgeMap = new Map();



  // Retrieve voxel coordinates. i-j-k is origin of voxel.
  const getVoxelPoints = (i, j, k, dims, origin, spacing) => {

    // (i,i+1),(j,j+1),(k,k+1) - i varies fastest; then j; then k

    voxelPts[0] = origin[0] + i * spacing[0]; // 0
    voxelPts[1] = origin[1] + j * spacing[1];
    voxelPts[2] = origin[2] + k * spacing[2];

    voxelPts[3] = voxelPts[0] + spacing[0]; // 1
    voxelPts[4] = voxelPts[1];
    voxelPts[5] = voxelPts[2];

    voxelPts[6] = voxelPts[0]; // 2
    voxelPts[7] = voxelPts[1] + spacing[1];
    voxelPts[8] = voxelPts[2];

    voxelPts[9] = voxelPts[3]; // 3
    voxelPts[10] = voxelPts[7];
    voxelPts[11] = voxelPts[2];

    voxelPts[12] = voxelPts[0]; // 4
    voxelPts[13] = voxelPts[1];
    voxelPts[14] = voxelPts[2] + spacing[2];

    voxelPts[15] = voxelPts[3]; // 5
    voxelPts[16] = voxelPts[1];
    voxelPts[17] = voxelPts[14];

    voxelPts[18] = voxelPts[0]; // 6
    voxelPts[19] = voxelPts[7];
    voxelPts[20] = voxelPts[14];

    voxelPts[21] = voxelPts[3]; // 7
    voxelPts[22] = voxelPts[7];
    voxelPts[23] = voxelPts[14];

  };



  // Compute point gradient at i-j-k location
  const getPointGradient = (i, j, k, dims, slice, spacing, s, g) => {
    let sp;
    let sm;

    // x-direction
    if (i === 0) {
      sp = s[i + 1 + j * dims[0] + k * slice];
      sm = s[i + j * dims[0] + k * slice];
      g[0] = (sm - sp) / spacing[0];
    } else if (i === dims[0] - 1) {
      sp = s[i + j * dims[0] + k * slice];
      sm = s[i - 1 + j * dims[0] + k * slice];
      g[0] = (sm - sp) / spacing[0];
    } else {
      sp = s[i + 1 + j * dims[0] + k * slice];
      sm = s[i - 1 + j * dims[0] + k * slice];
      g[0] = (0.5 * (sm - sp)) / spacing[0];
    }

    // y-direction
    if (j === 0) {
      sp = s[i + (j + 1) * dims[0] + k * slice];
      sm = s[i + j * dims[0] + k * slice];
      g[1] = (sm - sp) / spacing[1];
    } else if (j === dims[1] - 1) {
      sp = s[i + j * dims[0] + k * slice];
      sm = s[i + (j - 1) * dims[0] + k * slice];
      g[1] = (sm - sp) / spacing[1];
    } else {
      sp = s[i + (j + 1) * dims[0] + k * slice];
      sm = s[i + (j - 1) * dims[0] + k * slice];
      g[1] = (0.5 * (sm - sp)) / spacing[1];
    }

    // z-direction
    if (k === 0) {
      sp = s[i + j * dims[0] + (k + 1) * slice];
      sm = s[i + j * dims[0] + k * slice];
      g[2] = (sm - sp) / spacing[2];
    } else if (k === dims[2] - 1) {
      sp = s[i + j * dims[0] + k * slice];
      sm = s[i + j * dims[0] + (k - 1) * slice];
      g[2] = (sm - sp) / spacing[2];
    } else {
      sp = s[i + j * dims[0] + (k + 1) * slice];
      sm = s[i + j * dims[0] + (k - 1) * slice];
      g[2] = (0.5 * (sm - sp)) / spacing[2];
    }
  };



  // Compute voxel gradient values. i-j-k is origin point of voxel.
  const getVoxelGradients = (i, j, k, dims, slice, spacing, scalars) => {

    const g = [];

    getPointGradient(i, j, k, dims, slice, spacing, scalars, g);

    voxelGradients[0] = g[0];
    voxelGradients[1] = g[1];
    voxelGradients[2] = g[2];

    getPointGradient(i + 1, j, k, dims, slice, spacing, scalars, g);

    voxelGradients[3] = g[0];
    voxelGradients[4] = g[1];
    voxelGradients[5] = g[2];

    getPointGradient(i, j + 1, k, dims, slice, spacing, scalars, g);

    voxelGradients[6] = g[0];
    voxelGradients[7] = g[1];
    voxelGradients[8] = g[2];

    getPointGradient(
      i + 1,
      j + 1,
      k,
      dims,
      slice,
      spacing,
      scalars,
      g
    );

    voxelGradients[9] = g[0];
    voxelGradients[10] = g[1];
    voxelGradients[11] = g[2];

    getPointGradient(i, j, k + 1, dims, slice, spacing, scalars, g);

    voxelGradients[12] = g[0];
    voxelGradients[13] = g[1];
    voxelGradients[14] = g[2];

    getPointGradient(
      i + 1,
      j,
      k + 1,
      dims,
      slice,
      spacing,
      scalars,
      g
    );

    voxelGradients[15] = g[0];
    voxelGradients[16] = g[1];
    voxelGradients[17] = g[2];

    getPointGradient(
      i,
      j + 1,
      k + 1,
      dims,
      slice,
      spacing,
      scalars,
      g
    );

    voxelGradients[18] = g[0];
    voxelGradients[19] = g[1];
    voxelGradients[20] = g[2];

    getPointGradient(
      i + 1,
      j + 1,
      k + 1,
      dims,
      slice,
      spacing,
      scalars,
      g
    );

    voxelGradients[21] = g[0];
    voxelGradients[22] = g[1];
    voxelGradients[23] = g[2];
  };



  const produceTriangles = ({
    cVal,
    i,
    j,
    k,
    slice,
    dims,
    origin,
    spacing,
    scalars,
    points,
    normals
  }) => {

    const xyz = [];
    const n = [];
    const edge = [];
    let pId;
    let tmp;



    ids[0] = k * slice + j * dims[0] + i; // i, j, k
    ids[1] = ids[0] + 1; // i+1, j, k
    ids[2] = ids[0] + dims[0]; // i, j+1, k
    ids[3] = ids[2] + 1; // i+1, j+1, k
    ids[4] = ids[0] + slice; // i, j, k+1
    ids[5] = ids[4] + 1; // i+1, j, k+1
    ids[6] = ids[4] + dims[0]; // i, j+1, k+1
    ids[7] = ids[6] + 1; // i+1, j+1, k+1
    
    
    
    for (let ii = 0; ii < 8; ++ii) { voxelScalars[ii] = scalars[ids[ii]]; }



    let index = 0;

    for (let idx = 0; idx < 8; idx++) {

      if (voxelScalars[VERT_MAP[idx]] >= cVal) {

        index |= CASE_MASK[idx];

      }

    }



    const voxelTris = caseTable.getCase(index);

    //for (let ii = 0; ii < 8; ii++) { intensities[ids[ii]] += perfusionImage[ids[ii]]; }



    if (voxelTris[0] < 0) { return; }



    getVoxelPoints(i, j, k, dims, origin, spacing);

  

    if (model.computeNormals) {
      getVoxelGradients(i, j, k, dims, slice, spacing, scalars);
    }

    

    for (let idx = 0; voxelTris[idx] >= 0; idx += 3) {
     
      

      for (let eid = 0; eid < 3; eid++) {

        const edgeVerts = caseTable.getEdge(voxelTris[idx + eid]);

        pId = undefined;

        if (model.mergePoints) {

          edge[0] = ids[edgeVerts[0]];
          edge[1] = ids[edgeVerts[1]];
          if (edge[0] > edge[1]) {
            tmp = edge[0];
            edge[0] = edge[1];
            edge[1] = tmp;
          }
          pId = edgeMap.get(edge);

        }

        if (pId === undefined) {

          const t = (cVal - voxelScalars[edgeVerts[0]]) / (voxelScalars[edgeVerts[1]] - voxelScalars[edgeVerts[0]]);

          const x0 = voxelPts.slice(edgeVerts[0] * 3, (edgeVerts[0] + 1) * 3);
          const x1 = voxelPts.slice(edgeVerts[1] * 3, (edgeVerts[1] + 1) * 3);

          xyz[0] = x0[0] + t * (x1[0] - x0[0]);
          xyz[1] = x0[1] + t * (x1[1] - x0[1]);
          xyz[2] = x0[2] + t * (x1[2] - x0[2]);

          pId = points.length / 3;

          points.push(xyz[0], xyz[1], xyz[2]);



          if (model.computeNormals) {
            const n0 = voxelGradients.slice( edgeVerts[0] * 3, (edgeVerts[0] + 1) * 3 );
            const n1 = voxelGradients.slice( edgeVerts[1] * 3, (edgeVerts[1] + 1) * 3 );
            n[0] = n0[0] + t * (n1[0] - n0[0]);
            n[1] = n0[1] + t * (n1[1] - n0[1]);
            n[2] = n0[2] + t * (n1[2] - n0[2]);
            normalize(n);
            normals.push(n[0], n[1], n[2]);
          }



          if (model.mergePoints) {
            edge[0] = ids[edgeVerts[0]];
            edge[1] = ids[edgeVerts[1]];
            if (edge[0] > edge[1]) {
              tmp = edge[0];
              edge[0] = edge[1];
              edge[1] = tmp; 
            }
            edgeMap[edge as any] = pId;
          }

        }

      }

    }

  };



  return input => {

    const {dims, scalars, perfusionImage} = input;
    
    const pBuffer = [];

    const nBuffer = [];

    const { x,y,z } = dims;

    const perfusionPoints = [];

    const perfusionNormals = [];



    const slice = x * y;

    const spacing = [1,1,1];

    const origin = [0,0,0];



    for (let k = 0; k < z - 1; ++k) {

      for (let j = 0; j < y - 1; ++j) {

        for (let i = 0; i < x - 1; ++i) {

          produceTriangles({

            cVal:model.contourValue,

            i,
            j,
            k,
        
            slice,
            dims:[x,y,z],
            origin,
            spacing,
        
            scalars,
        
            points:pBuffer,
            normals:nBuffer

          });

          produceTriangles({

            cVal:model.contourValue,

            i,
            j,
            k,
        
            slice,
            dims:[x,y,z],
            origin,
            spacing,
        
            scalars:perfusionImage,
        
            points:perfusionPoints,
            normals:perfusionNormals

          });

        }

      }

    }



    return { p : pBuffer, n : nBuffer, perfusionPoints, perfusionNormals }

  };

}