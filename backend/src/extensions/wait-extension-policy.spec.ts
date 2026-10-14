import {
  waitExtensionMinutesForUse,
  weeklyWaitExtensionState,
} from './wait-extension-policy';

describe('wait extension weekly policy', () => {
  it('gives 10 minutes first and 5 minutes second', () => {
    expect(waitExtensionMinutesForUse(1)).toBe(10);
    expect(waitExtensionMinutesForUse(2)).toBe(5);
    expect(waitExtensionMinutesForUse(3)).toBeNull();
  });

  it('reports remaining weekly capacity', () => {
    expect(weeklyWaitExtensionState(0)).toEqual({
      used: 0,
      remaining: 2,
      nextMinutes: 10,
    });
    expect(weeklyWaitExtensionState(1)).toEqual({
      used: 1,
      remaining: 1,
      nextMinutes: 5,
    });
    expect(weeklyWaitExtensionState(2)).toEqual({
      used: 2,
      remaining: 0,
      nextMinutes: null,
    });
  });
});
