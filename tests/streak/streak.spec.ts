// tests/streak.spec.ts
import { test, expect } from '@playwright/test';
import { calculateStreak } from '@/lib/streak';

test.describe('calculateStreak()', () => {
  test('resets to 1 when there was a gap of more than one day', () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    const result = calculateStreak(threeDaysAgo, 5, 7);
    expect(result?.current).toBe(1);
    expect(result?.longest).toBe(7);
  });
  test('adds 1 to current streak when last login was yesterday', () => {
    const yesterday = new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000
    ).toISOString();
    const result = calculateStreak(yesterday, 2, 4);
    expect(result?.current).toBe(3);
  });
  
  test('increments both current and longest when last login was yesterday', () => {
    const yesterday = new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000
    ).toISOString();
    const result = calculateStreak(yesterday, 2, 4);
    // code adds +1 to both streak and longest
    expect(result?.current).toBe(3);
    expect(result?.longest).toBe(5);
  });

  test('keeps the same streak when last login is today', () => {
    const today = new Date().toISOString();
    const result = calculateStreak(today, 3, 6);
    expect(result?.current).toBe(3);
    expect(result?.longest).toBe(6);
  });

  test('defaults to 1/1 when no last_login_date is provided', () => {
    // @ts-expect-error testing null input
    const result = calculateStreak(null, 10, 12);
    expect(result?.current).toBe(1);
    expect(result?.longest).toBe(1);
  });
});
