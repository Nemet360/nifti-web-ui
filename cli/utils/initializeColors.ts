
const skinColor = { r : 255/255, g : 224/255, b : 189/255 };

const greyMatterColor = { r : 0.925, g : 0.5, b : 0.5 };


export const initializeColors = (length, datatypeCode ) => {

    const rgb = [];

    const color = datatypeCode==4 ? skinColor : greyMatterColor;

    for(let i = 0; i < length; i++){

        rgb.push(color.r, color.g, color.b);

    }

    return rgb;

}
