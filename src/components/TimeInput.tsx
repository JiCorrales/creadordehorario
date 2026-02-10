import React, { useEffect, useState, useMemo } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  minHour?: number;
  maxHour?: number;
  minTime?: string; // "HH:MM"
  error?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  className,
  required,
  minHour = 7,
  maxHour = 23,
  minTime,
  error
}) => {
  const [hour, setHour] = useState(() => {
    if (value && value.includes(':')) {
      return value.split(':')[0];
    }
    return '07';
  });
  const [minute, setMinute] = useState(() => {
    if (value && value.includes(':')) {
      return value.split(':')[1];
    }
    return '00';
  });

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');

      // Only update state if different to prevent cursor jumps or unnecessary renders
      // But we must respect the value prop if it comes from parent (e.g. load from DB)
      // Check if current state matches value
      if (h !== hour || m !== minute) {
          // If minute is being typed (e.g. "2"), don't overwrite it with "02" immediately if it matches partial
          // However, here we are receiving the prop. If prop changes, we MUST update.
          // The issue might be that onChange triggers a parent update which sends back formatted value.

          // Fix for "20" -> "02" issue:
          // If we are typing, we might not want to enforce padStart from the prop loop immediately
          // if the values are semantically the same but formatted differently?
          // No, the prop usually comes formatted.

          // Let's trust the prop, BUT:
          // If we just typed "2", parent might receive "07:02" and send back "07:02".
          // Then our input becomes "02" instead of "2".
          // This is standard controlled input behavior.
          // To fix the typing experience, we should only update from prop if it's significantly different
          // or if we are not focused? Hard to know focus state here easily without ref.

          // Actually, the previous logic was:
          // onChange(`${hour}:${newMinute.padStart(2, '0')}`);
          // This sends "02" immediately when you type "2".
          // This is why "2" becomes "02".
          // And then you type "0" after "02", it becomes "020" -> sliced to "02".

          // The fix in handleMinuteChange above removes the immediate padStart for the local state,
          // but we still send formatted to parent.
          // If parent sends back formatted value, we overwrite local state.

          // If we typed "2", sent "07:02", parent sends back value="07:02".
          // Effect runs: m="02". setMinute("02"). Input shows "02".
          // User wanted to type "20". They typed "2", got "02".
          // They are stuck.

          // Solution: Don't padStart in onChange until blur?
          // But we need valid time for other validations (e.g. end time > start time).

          // Better Solution:
          // Only update from prop if the integer value is different?
          // "2" vs "02" -> same int.
          // If I have "2" in state, and prop comes as "02", I should keep "2" to let user continue typing.

          if (h !== hour) setHour(h);

          if (m !== minute) {
              const mInt = parseInt(m);
              const minuteInt = parseInt(minute || '0');
              // Update if numbers don't match, OR if the prop changed to something completely different
              // If I typed "2", prop is "02". ints match. Don't update minute state.
              // If I typed "20", prop is "20". ints match.
              if (mInt !== minuteInt || m === '00' && minute === '') {
                  setMinute(m);
              }
          }
      }
    }
  }, [value]);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setHour(newHour);
    onChange(`${newHour}:${minute}`);
  };

  const handleHourBlur = () => {
    // Re-trigger onChange on blur to ensure value is committed even if select wasn't "changed" but was focused?
    // Actually, select change fires immediately. The issue is likely when select is focused but not changed.
    // We can ensure the current state is valid.
    if (hour) {
        onChange(`${hour}:${minute}`);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinute = e.target.value;

    // Limit to 2 digits, but allow any number typing
    if (newMinute.length > 2) newMinute = newMinute.slice(0, 2);

    setMinute(newMinute);

    const num = parseInt(newMinute);
    if (!isNaN(num) && num >= 0 && num <= 59) {
        onChange(`${hour}:${newMinute.padStart(2, '0')}`);
    } else if (newMinute === '') {
        // If empty, keep local state empty but don't trigger onChange with invalid time
    }
  };

  const handleMinuteBlur = () => {
    let m = minute;
    if (m === '') m = '00';

    let num = parseInt(m);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 59) num = 59;

    const formatted = num.toString().padStart(2, '0');
    setMinute(formatted);
    onChange(`${hour}:${formatted}`);
  };

  const hours = useMemo(() => {
    const minH = minTime ? parseInt(minTime.split(':')[0]) : minHour;
    const h = [];
    for (let i = minH; i <= maxHour; i++) {
      h.push(i.toString().padStart(2, '0'));
    }
    return h;
  }, [minHour, maxHour, minTime]);

  // Ensure current hour is valid when constraints change
  useEffect(() => {
    // Fix for race condition when loading existing data:
    // If the incoming value prop is valid within the new constraints (hours),
    // we should trust it and NOT force a change based on stale 'hour' state.
    // The other useEffect will update 'hour' state to match 'value'.
    if (value && value.includes(':')) {
      const [h] = value.split(':');
      if (hours.includes(h)) {
        return;
      }
    }

    if (!hours.includes(hour)) {
       // If current hour is not in valid list, switch to the first valid one
       // But only if we have options.
       if (hours.length > 0) {
           setHour(hours[0]);
           onChange(`${hours[0]}:${minute}`);
       }
    }
  }, [hours, hour, minute, onChange, value]);

  return (
    <div className={`flex flex-col relative ${className || ''}`}>
      <div className="flex items-center gap-1 w-full">
        <select
          value={hour}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          className={`block flex-1 min-w-0 h-9 px-2 text-sm bg-white dark:bg-gray-700 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 relative z-0 dark:text-white appearance-none text-center ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          required={required}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-gray-500 dark:text-gray-400 font-bold flex-shrink-0">:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={minute}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          placeholder="MM"
          className={`block flex-1 min-w-0 h-9 px-2 text-sm bg-white dark:bg-gray-700 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center relative z-0 dark:text-white ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          required={required}
        />
      </div>
      {error && <span className="text-[10px] text-red-500 dark:text-red-400 mt-1 leading-tight">{error}</span>}
    </div>
  );
};

export default TimeInput;
