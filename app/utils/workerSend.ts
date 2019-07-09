import { filter, first, map } from 'rxjs/operators';
import { fromEvent } from 'rxjs/observable/fromEvent'; 



export const workerSend = (worker:any) => {

    return data => new Promise(

        resolve => {
            
            fromEvent(worker, 'message', event => event.data).pipe( first() ).subscribe( resolve )

            worker.postMessage(data);
            
        }

    );

}