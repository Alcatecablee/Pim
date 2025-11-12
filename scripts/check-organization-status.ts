#!/usr/bin/env tsx

import * as fs from 'fs';

console.log('📊 Video Organization Status Check\n');

// Check if log file exists
const logFile = 'video-organization-progress.log';
if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');
  
  console.log('Last 30 lines of progress log:');
  console.log('─'.repeat(60));
  console.log(lines.slice(-30).join('\n'));
  console.log('─'.repeat(60));
  
  // Parse progress
  const totalMatch = content.match(/Total videos found: (\d+)/);
  const createdMatch = content.match(/Created folder: "([^"]+)"/g);
  const movedMatch = content.match(/moved to/g);
  
  if (totalMatch) {
    console.log(`\n✅ Total videos analyzed: ${totalMatch[1]}`);
  }
  if (createdMatch) {
    console.log(`📁 Folders created: ${createdMatch.length}`);
  }
  if (movedMatch) {
    console.log(`📦 Videos moved: ${movedMatch.length}`);
  }
} else {
  console.log('❌ No progress log found. The organization script may not have started yet.');
  console.log('\nTo start the organization, run:');
  console.log('  npx tsx scripts/organize-all-videos-by-artist.ts > video-organization-progress.log 2>&1 &');
}
