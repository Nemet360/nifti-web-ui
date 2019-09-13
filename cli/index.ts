import { readNIFTIFile } from './utils/readNIFTIFile';
import { all, reject, isEmpty } from 'ramda';
import { transform } from './utils/transform';
import * as fs from 'fs';
import { basename } from 'path';

const files = process.argv.slice(2);

if(files.length !== 5) {
  console.log("You should put 5 files!");
  process.exit(0);
}

const outputFile = files.pop();

const atlas = v => basename(v) ==="wBRODMANN_SubCort_WM.nii";

function valid(list) {

  const isNii = entry => entry.indexOf(".nii")!==-1;

  return Promise.resolve(false)

    .then(
      valid => {

        if( list.length!==4 || ! all(isNii)(list) ){
          console.log('You need to input 4 files!');
          return;
        }

        return Promise.all( list.map(readNIFTIFile) )

          .then((result:any[]) => {

            /*i should evaluate headers too, but there is no guaranty they comply to specific format for different types*/

            const two = result.find(entry => entry.niftiHeader.datatypeCode===2);

            const four = result.find(entry => entry.niftiHeader.datatypeCode===4);

            const sixteen = result.find(entry => entry.niftiHeader.datatypeCode===16);

            return true;

          })

      }
    )

}

function loadFiles(files) {
  console.log('Working...');
  valid(files)

    .then(
      valid => {

        if(valid){

          const data = reject(atlas)(files);

          const a = files.find(atlas);

          const n = data.length - 1;


          generateMeshes(data, a);

        }else{

          console.log("Selected files have incorrect format");

        }

      }
}

function generateMeshes (data, atlas) {

  if(isEmpty(data)){ return }

  const first = data[0];

  const remainder = data.slice(1, data.length);

  const workers = remainder.map(data =>  transform({ file: data, atlas }));



  return Promise.all([

    transform({file:first, atlas}),

    ...workers

  ])

    .then(collection => {

      return fs.writeFileSync(outputFile, JSON.stringify(collection));


    })

}


loadFiles(files);
