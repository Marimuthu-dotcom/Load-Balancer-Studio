/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CLI Test Runner for Network Load Balancer Test Suite
 */

import { runSimulatorTestSuite } from '../src/engine/tests.js';

console.log('====================================================');
console.log(' Network Load Balancer - Automated Test Verification');
console.log('====================================================\n');

const suite = runSimulatorTestSuite();

suite.results.forEach((test) => {
  const icon = test.passed ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`${icon} #${test.id.toString().padStart(2, ' ')}: ${test.title}`);
  if (test.detail) {
    console.log(`         ${test.detail}`);
  }
});

console.log('\n----------------------------------------------------');
console.log(`Total Tests Run : ${suite.total}`);
console.log(`Passed          : ${suite.passedCount}`);
console.log(`Failed          : ${suite.failedCount}`);
console.log(`Execution Time  : ${suite.timestamp}`);
console.log('----------------------------------------------------');

if (suite.allPassed) {
  console.log(`STATUS: ALL ${suite.total} TESTS PASSED SUCCESSFULLY.\n`);
  process.exit(0);
} else {
  console.error('STATUS: TEST SUITE FAILED.\n');
  process.exit(1);
}
