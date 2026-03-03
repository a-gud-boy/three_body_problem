class Complex {
    constructor(re, im = 0) {
        this.re = re;
        this.im = im;
    }

    add(c) { return new Complex(this.re + c.re, this.im + c.im); }
    sub(c) { return new Complex(this.re - c.re, this.im - c.im); }
    mul(c) { return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re); }

    div(c) {
        const denom = c.re * c.re + c.im * c.im;
        if (denom === 0) throw new Error("Division by zero in complex number");
        return new Complex(
            (this.re * c.re + this.im * c.im) / denom,
            (this.im * c.re - this.re * c.im) / denom
        );
    }

    mag() { return Math.sqrt(this.re * this.re + this.im * this.im); }
    phase() { return Math.atan2(this.im, this.re); }

    static fromPolar(r, theta) {
        return new Complex(r * Math.cos(theta), r * Math.sin(theta));
    }
}

export default Complex;
