
export const measureTime = (f:(...args) => any, name?:string) => 

    (...args) => {

        const start : number = performance.now();
        const data = f.apply(null,args); 
        const finish : number = performance.now();
     
        console.log(`${name ? name : f.name} - time of execution : ${finish - start} ms`);
     
        return data; 

    }; 

