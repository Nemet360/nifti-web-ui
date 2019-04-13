const norm = (x, n = 3) => {

    switch (n) {
      case 1:
        return Math.abs(x);
      case 2:
        return Math.sqrt(x[0] * x[0] + x[1] * x[1]);
      case 3:
        return Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
      default: {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += x[i] * x[i];
        }
        return Math.sqrt(sum);
      }
    }

}



export const normalize = x => {

    const den = norm(x);

    if (den !== 0.0) {
      x[0] /= den;
      x[1] /= den;
      x[2] /= den;
    }

    return den;

}