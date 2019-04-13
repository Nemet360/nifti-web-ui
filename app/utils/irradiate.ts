const irradiate = (slice, i, j, k, dims, intensities, perfusionImage) => {

    let ids = [];

    for(let c = 1; c<100; c++){
        let step = c;

        ids[0] = k * slice + j * dims[0] + i;

        ids[1] = (k * (slice+step)) + j * dims[0] + i;

        ids[2] = (k * (slice-step)) + j * dims[0] + i;

        ids[3] = k * slice + ((j+step) * dims[0]) + i; 
        ids[4] = k * slice + ((j-step) * dims[0]) + i; 
        ids[5] = k * slice + j * dims[0] + i+1;
        ids[6] = k * slice + j * dims[0] + i-1;
        ids[7] = k * slice + j * dims[0] + i;

        for (let ii = 0; ii < 8; ii++) { 

          if( isNaN(intensities[ids[ii]]) ){ intensities[ids[ii]] = 0; }

          if( perfusionImage[ids[ii]] && !isNaN(perfusionImage[ids[ii]]) ){
              intensities[ids[ii]] += perfusionImage[ids[ii]]/c; 
          }

        }

    }

  }
