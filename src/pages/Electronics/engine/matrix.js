// matrix utilities for Modified Nodal Analysis

import Complex from './Complex.js';

export function solveRealMatrix(inputA, inputB) {
    const n = inputA.length;
    // Deep clone to avoid mutating caller's data
    const A = inputA.map(row => [...row]);
    const B = [...inputB];

    // Gaussian elimination with partial pivoting
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
                maxRow = j;
            }
        }

        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [B[i], B[maxRow]] = [B[maxRow], B[i]];

        if (Math.abs(A[i][i]) < 1e-12) {
            console.error("Singular matrix");
            return null; // Singular matrix
        }

        for (let j = i + 1; j < n; j++) {
            let factor = A[j][i] / A[i][i];
            for (let k = i; k < n; k++) {
                A[j][k] -= factor * A[i][k];
            }
            B[j] -= factor * B[i];
        }
    }

    const X = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * X[j];
        }
        X[i] = (B[i] - sum) / A[i][i];
    }

    return X;
}

export function solveComplexMatrix(inputA, inputB) {
    const n = inputA.length;
    // Deep clone to avoid mutating caller's data
    const A = inputA.map(row => row.map(c => new Complex(c.re, c.im)));
    const B = inputB.map(c => new Complex(c.re, c.im));

    // Gaussian elimination with partial pivoting for complex numbers
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            if (A[j][i].mag() > A[maxRow][i].mag()) {
                maxRow = j;
            }
        }

        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [B[i], B[maxRow]] = [B[maxRow], B[i]];

        if (A[i][i].mag() < 1e-12) {
            console.error("Singular complex matrix");
            return null;
        }

        for (let j = i + 1; j < n; j++) {
            let factor = A[j][i].div(A[i][i]);
            for (let k = i; k < n; k++) {
                A[j][k] = A[j][k].sub(factor.mul(A[i][k]));
            }
            B[j] = B[j].sub(factor.mul(B[i]));
        }
    }

    const X = new Array(n).fill(null).map(() => new Complex(0));
    for (let i = n - 1; i >= 0; i--) {
        let sum = new Complex(0);
        for (let j = i + 1; j < n; j++) {
            sum = sum.add(A[i][j].mul(X[j]));
        }
        X[i] = B[i].sub(sum).div(A[i][i]);
    }

    return X;
}
