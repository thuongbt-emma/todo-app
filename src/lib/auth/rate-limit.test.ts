import { describe, expect, it } from 'vitest';
import { clientKey, LoginLimiter } from './rate-limit';

describe('LoginLimiter', () => {
  it('locks after 5 failures within 10 minutes, for 10 minutes', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 4; i++) l.recordFailure('ip', i * 1000);
    expect(l.isLocked('ip', 5000)).toBe(false);
    l.recordFailure('ip', 5000);
    expect(l.isLocked('ip', 6000)).toBe(true);
    expect(l.isLocked('ip', 5000 + 600_001)).toBe(false);
  });
  it('forgets failures older than the window', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 4; i++) l.recordFailure('ip', 0);
    l.recordFailure('ip', 700_000);
    expect(l.isLocked('ip', 700_001)).toBe(false);
  });
  it('reset clears state', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 5; i++) l.recordFailure('ip', 0);
    l.reset('ip');
    expect(l.isLocked('ip', 1)).toBe(false);
  });
});

describe('LoginLimiter global cap', () => {
  it('locks everyone once 20 failures across keys happen within 10 minutes', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 19; i++) l.recordFailure(`ip${i}`, i * 1000);
    expect(l.isLocked('someone-new', 19_000)).toBe(false);
    l.recordFailure('ip19', 19_000);
    expect(l.isLocked('someone-new', 20_000)).toBe(true);
    expect(l.isLocked('ip0', 20_000)).toBe(true);
  });
  it('lifts the global lock once the window passes', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 20; i++) l.recordFailure(`ip${i}`, 0);
    expect(l.isLocked('x', 599_999)).toBe(true);
    expect(l.isLocked('x', 600_000)).toBe(false);
  });
  it('does not count failures older than the window towards the global cap', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 19; i++) l.recordFailure(`ip${i}`, 0);
    l.recordFailure('late', 700_000);
    expect(l.isLocked('x', 700_001)).toBe(false);
  });
});

describe('LoginLimiter pruning', () => {
  it('drops expired failure and lock entries for all keys on recordFailure', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 10; i++) l.recordFailure(`ip${i}`, 0);
    for (let i = 0; i < 5; i++) l.recordFailure('locked', 0);
    expect(l.trackedKeys).toBe(11);
    l.recordFailure('fresh', 2_000_000);
    expect(l.trackedKeys).toBe(1);
  });
});

describe('clientKey', () => {
  it('uses the rightmost non-empty x-forwarded-for hop', () => {
    expect(clientKey('1.1.1.1, 2.2.2.2, 3.3.3.3')).toBe('3.3.3.3');
    expect(clientKey('spoofed, 9.9.9.9 , ')).toBe('9.9.9.9');
    expect(clientKey('4.4.4.4')).toBe('4.4.4.4');
  });
  it('falls back to local', () => {
    expect(clientKey(null)).toBe('local');
    expect(clientKey(undefined)).toBe('local');
    expect(clientKey(' , ,')).toBe('local');
  });
});
