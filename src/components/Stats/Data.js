export class Data {
  constructor(runData, filters, charList, abilityList) {
    this.unfilteredRunData = runData;
    this.runData = runData;
    this.flagsetFilter = filters.flagsetFilter.value;
    this.raceFilter = filters.raceFilter.value;
    this.charList = charList;
    this.abilityList = abilityList;

    if (this.flagsetFilter === "All") {
      this.runData = runData;
    } else {
      // Filter by flagset
      this.runData = this.runData.filter(
        (data) => data.flagset === this.flagsetFilter
      );
      if (this.raceFilter !== "All") {
        // Then filter by race
        this.runData = this.runData.filter(
          (data) => data.race === this.raceFilter
        );
      }
    }
  }

  attempt() {
    return this.runData.length;
  }

  bestTime() {
    return this.bestRun().runTime;
  }

  lastTime() {
    return this.lastRun().runTime;
  }

  bestRun() {
    return this.sortByTime()[0];
  }

  lastRun() {
    return this.sortByDate()[this.runData.length - 1];
  }

  standardDeviation() {
    const mean = this.averageTimeRaw(this.runData.length);
    let runs = this.sortByDate().map((a) => a.runTimeRaw);

    runs = runs.map((k) => {
      return (k - mean) ** 2;
    });
    const sum = runs.reduce((acc, curr) => acc + curr, 0);

    return this.convertRawToTime(
      Math.floor(Math.round(Math.sqrt(sum / runs.length)) / 1000) * 1000
    );
  }

  runTimes() {
    let times = [];
    const sortedTimes = this.sortByDate();

    for (let i = 0; i < sortedTimes.length; i++) {
      times.push({
        attempt: sortedTimes[i].attempt,
        time: sortedTimes[i].runTimeRaw,
        date: sortedTimes[i].runDate,
        skip: sortedTimes[i].skip,
        name: Date.parse(sortedTimes[i].runDate),
      });
    }
    return times;
  }

  averageTimeRaw(numOfRuns, offset = 0) {
    let runs;
    if (numOfRuns > 0) {
      runs = this.sortByDate().slice(
        this.runData.length - numOfRuns,
        this.runData.length - offset
      );
    } else {
      runs = this.sortByDate();
    }
    const average = (array) =>
      array.reduce((a, b) => a + b.runTimeRaw, 0) / array.length; // Average of millaseconds
    return average(runs);
  }

  averageTime(numOfRuns = this.runData.length) {
    return this.convertRawToTime(
      Math.floor(Math.round(this.averageTimeRaw(numOfRuns)) / 1000) * 1000
    ); // Convert to hh:mm:ss, while rounding to the nearest second
  }

  deltaRunTime(numOfRuns = this.runData.length) {
    let delta =
      this.averageTimeRaw(numOfRuns, 1) - this.averageTimeRaw(numOfRuns);

    if (isNaN(delta)) {
      delta = 0;
    }
    let negative = false;

    if (delta < 0) {
      negative = true;
      delta = Math.abs(delta);
    }
    return {
      time: this.convertRawToTime(Math.floor(Math.round(delta) / 1000) * 1000),
      negative: negative,
    };
  }

  startingCharacters() {
    let times = {};
    for (let i = 0; i < this.runData.length; i++) {
      for (let char = 0; char < this.runData[i].chars.length; char++) {
        if (!(this.runData[i].chars[char] in times)) {
          times[this.runData[i].chars[char]] = [this.runData[i].runTimeRaw];
        } else {
          times[this.runData[i].chars[char]].push(this.runData[i].runTimeRaw);
        }
      }
    }

    let timesPerChar = [];
    const average = (array) => array.reduce((a, b) => a + b, 0) / array.length;

    //Sort chars based on enum order
    for (let i = 0; i < this.charList.length; i++) {
      if (this.charList[i] in times) {
        timesPerChar.push({
          name: this.charList[i],
          time: Math.round(average(times[this.charList[i]])),
          runs: times[this.charList[i]].length,
        });
      }
    }

    return timesPerChar;
  }

  startingAbilities() {
    let times = {};
    for (let i = 0; i < this.runData.length; i++) {
      for (
        let ability = 0;
        ability < this.runData[i].abilities.length;
        ability++
      ) {
        if (!(this.runData[i].abilities[ability] in times)) {
          times[this.runData[i].abilities[ability]] = [
            this.runData[i].runTimeRaw,
          ];
        } else {
          times[this.runData[i].abilities[ability]].push(
            this.runData[i].runTimeRaw
          );
        }
      }
    }

    let timesPerAbility = [];
    const average = (array) => array.reduce((a, b) => a + b, 0) / array.length;

    //Sort ability based on enum order
    for (let i = 0; i < this.abilityList.length; i++) {
      if (this.abilityList[i] in times) {
        // Logic to get display name from id name
        // IE: `foo_bar` will be translated to `foo bar`
        let abilityDisplayName = this.abilityList[i];
        if (this.abilityList[i].includes("_"))
          abilityDisplayName = this.abilityList[i]
            .replace(/__/g, " - ")
            .replace(/_/g, " ");

        timesPerAbility.push({
          name: abilityDisplayName,
          time: Math.round(average(times[this.abilityList[i]])),
          runs: times[this.abilityList[i]].length,
        });
      }
    }
    return timesPerAbility;
  }

  sortByTime() {
    return this.runData.sort((a, b) => a.runTimeRaw - b.runTimeRaw);
  }

  sortByAttempt() {
    return this.runData.sort((a, b) => a.attempt - b.attempt);
  }

  sortByDate() {
    let runsWithEpoch = [];
    for (let i = 0; i < this.runData.length; i++) {
      runsWithEpoch.push({
        ...this.runData[i],
        dateEpoch: Date.parse(this.runData[i].runDate),
      });
    }
    return runsWithEpoch.sort((a, b) => a.dateEpoch - b.dateEpoch);
  }

  flagsets() {
    let uniqueFlagsets = Array.from(
      new Set(this.unfilteredRunData.map(({ flagset }) => flagset))
    );
    let flagsets = [{ name: "All", displayName: "All" }];

    for (let i = 0; i < uniqueFlagsets.length; i++) {
      // Logic to get display name from id name
      // IE: `foo_bar` will be translated to `foo bar`
      let elemDisplayName = uniqueFlagsets[i];
      if (uniqueFlagsets[i].includes("_"))
        elemDisplayName = uniqueFlagsets[i]
          .replace(/__/g, " - ")
          .replace(/_/g, " ");
      flagsets.push({
        name: uniqueFlagsets[i],
        displayName: elemDisplayName,
      });
    }
    return flagsets;
  }

  races() {
    let races = [{ name: "All", displayName: "All" }];

    if (this.flagsetFilter !== "All") {
      // First we get all the flagsets from the global, unfiltered data
      // Then we filter for our current flagset
      const flagsetData = this.unfilteredRunData.filter(
        (data) => data.flagset === this.flagsetFilter
      );
      let uniqueRaces = Array.from(
        new Set(flagsetData.map(({ race }) => race))
      );

      for (let i = 0; i < uniqueRaces.length; i++) {
        // Logic to get display name from id name
        // IE: `foo_bar` will be translated to `foo bar`
        let elemDisplayName = uniqueRaces[i];
        if (uniqueRaces[i].includes("_"))
          elemDisplayName = uniqueRaces[i]
            .replace(/__/g, " - ")
            .replace(/_/g, " ");
        races.push({ name: uniqueRaces[i], displayName: elemDisplayName });
      }
    }
    return races;
  }

  convertRawToTime(rawRunTime) {
    // 1- Convert to seconds:
    let seconds = rawRunTime / 1000;
    // 2- Extract hours:
    const hours = parseInt(seconds / 3600); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    // 3- Extract minutes:
    const minutes = parseInt(seconds / 60); // 60 seconds in 1 minute
    // 4- Keep only seconds not extracted to minutes:
    seconds = seconds % 60;
    return (
      hours +
      ":" +
      (minutes < 10 ? `0${minutes}` : minutes) +
      ":" +
      (seconds < 10 ? `0${seconds}` : seconds)
    );
  }
}
