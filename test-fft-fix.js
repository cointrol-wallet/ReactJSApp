// Test FFT fixes
const { fft, ifft, adjFft } = require('./src/crypto/fft.ts');

console.log("Testing FFT base case fix...");
const testPoly = [1.0, 2.0];
const fftResult = fft(testPoly);
console.log("Input:", testPoly);
console.log("FFT result:", fftResult);
console.log("Expected: [{re: 1, im: 2}, {re: 1, im: -2}]");
console.log("Match:", 
  Math.abs(fftResult[0].re - 1) < 0.001 &&
  Math.abs(fftResult[0].im - 2) < 0.001 &&
  Math.abs(fftResult[1].re - 1) < 0.001 &&
  Math.abs(fftResult[1].im + 2) < 0.001 ? "✓" : "✗"
);

console.log("\nTesting iFFT base case fix...");
const testFFT = [{re: 3, im: 4}, {re: 5, im: 6}];
const ifftResult = ifft(testFFT);
console.log("Input:", testFFT);
console.log("iFFT result:", ifftResult);
console.log("Expected: [3, 4] (takes re and im from first element)");
console.log("Match:", ifftResult[0] === 3 && ifftResult[1] === 4 ? "✓" : "✗");

console.log("\nTesting adjFft fix...");
const testAdj = [{re: 1, im: 2}, {re: 3, im: 4}, {re: 5, im: 6}];
const adjResult = adjFft(testAdj);
console.log("Input:", testAdj);
console.log("adjFft result:", adjResult);
console.log("Expected: conjugate only, same order");
console.log("Match:",
  adjResult[0].re === 1 && adjResult[0].im === -2 &&
  adjResult[1].re === 3 && adjResult[1].im === -4 &&
  adjResult[2].re === 5 && adjResult[2].im === -6 ? "✓" : "✗"
);
