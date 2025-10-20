#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Dopamine Hero Setup Validator\n');

const checks = [
  {
    name: 'Node.js Version',
    command: 'node --version',
    expected: /v(1[89]|2[0-9])\./,
    description: 'Node.js 18.0.0 or higher'
  },
  {
    name: 'npm Version',
    command: 'npm --version',
    expected: /^[9-9]\./,
    description: 'npm 9.0.0 or higher'
  },
  {
    name: 'Git Version',
    command: 'git --version',
    expected: /git version/,
    description: 'Git installed'
  },
  {
    name: 'Docker Version',
    command: 'docker --version',
    expected: /Docker version/,
    description: 'Docker installed'
  }
];

let passed = 0;
let failed = 0;

console.log('📋 Checking prerequisites...\n');

checks.forEach(check => {
  try {
    const output = execSync(check.command, { encoding: 'utf8' }).trim();
    const success = check.expected.test(output);

    if (success) {
      console.log(`✅ ${check.name}: ${output}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}: ${output} (Expected: ${check.description})`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.name}: Command failed - ${error.message}`);
    failed++;
  }
});

console.log('\n📁 Checking project structure...\n');

const structureChecks = [
  { path: 'package.json', description: 'Root package.json' },
  { path: 'apps/web/package.json', description: 'Web app package.json' },
  { path: 'apps/api/package.json', description: 'API app package.json' },
  { path: 'apps/web/.env.example', description: 'Web environment template' },
  { path: 'apps/api/.env.example', description: 'API environment template' },
  { path: 'docs/setup-guide.md', description: 'Setup documentation' }
];

structureChecks.forEach(check => {
  if (fs.existsSync(check.path)) {
    console.log(`✅ ${check.description}: ${check.path}`);
    passed++;
  } else {
    console.log(`❌ ${check.description}: ${check.path} not found`);
    failed++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 All checks passed! Your environment is ready for development.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above and consult the setup guide.');
  process.exit(1);
}