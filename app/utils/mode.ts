
export const mode = list => {

    const arr = [...list];
  
    return arr.sort((a,b) => arr.filter(v => v===a).length - arr.filter(v => v===b).length).pop();
  
}