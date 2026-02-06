import { adj, adjPoly } from './src/crypto/fft';

// Test with a small polynomial
const testPoly = [1, 2, 3, 4];

const result1 = adj(testPoly);
const result2 = adjPoly(testPoly);

console.log('adj(testPoly):', result1);
console.log('adjPoly(testPoly):', result2);
console.log('Match:', result1.every((v, i) => Math.abs(v - result2[i]) < 1e-10));
