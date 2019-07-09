
export const measureTimePromise = (f:(...args) => Promise<any>, name?:string) => 

    (...args) : Promise<any> => {
        const start : number = performance.now();

        return f.apply(null,args)
                .then((data) => {

                    const finish : number = performance.now();
            
                    console.log(`${name ? name : f.name} - time of execution : ${finish - start} ms`);
                
                    return data;

                }); 
    }; 
