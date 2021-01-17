(function (d3) {
  'use strict';

  const allCaps = (str) => str === str.toUpperCase();
  const isRegion = (name) =>
    allCaps(name) && name !== 'WORLD';
  const parseYear = d3.timeParse('%Y');

  const melt = (unData, minYear, maxYear) => {
    const years = d3.range(minYear, maxYear + 1);
    const data = [];
    unData.forEach((d) => {
      const name = d['Region, subregion, country or area *'].replace('AND THE','&');
      years.forEach((year) => {
        const population = +d[year].replace(/ /g, '') * 1000;
        const row = {
          year: parseYear(year),
          name,
          population,
        };
        data.push(row);
      });
    });
    return data.filter((d) => isRegion(d.name));
  };
  const loadAndProcessData = () =>
    Promise.all([
      d3.csv(
        'https://vizhub.com/curran/datasets/un-population-estimates-2017-medium-variant.csv'
      ),
      d3.csv(
        'https://vizhub.com/curran/datasets/un-population-estimates-2017.csv'
      ),
    ]).then(([unDataMediumVariant, unDataEstimates]) => {
      return melt(unDataEstimates, 1950, 2014).concat(
        melt(unDataMediumVariant, 2015, 2100)
      );
    });

  const colorLegend = (selection, props) => {
    const {
      colorScale,
      circleRadius,
      spacing,
      textOffset,
    } = props;

    const groups = selection
      .selectAll('g')
      .data(colorScale.domain());

    const groupsEnter = groups
      .enter()
      .append('g')
      .attr('class', 'tick');

    groupsEnter
      .merge(groups)
      .attr(
        'transform',
        (d, i) => `translate(0,${i * spacing})`
      );
    groupsEnter
      .append('circle')
      .merge(groups.select('circle'))
      .attr('fill', colorScale)
      .attr('r', circleRadius);

    groupsEnter
      .append('text')
      .attr('x', textOffset)
      .attr('dy', '.32em')
      .merge(groups.select('text'))
      .text((d) => d);
  };

  const lineChart = (selection, props) => {
    const {
      colorScale,
      yValue,
      xValue,
      xAxisLabel,
      yAxisLabel,
      title,
      margin,
      width,
      height,
      data,
      nested,
      selectedYear,
      setSelectedYear,
    } = props;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, xValue))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, yValue))
      .range([innerHeight, 0])
      .nice();

    const xAxis = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickPadding(15);

    const yAxisTickFormat = (number) =>
      d3.format('.2s')(number)
        .replace('G', 'B')
        .replace('.0', '');

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(yAxisTickFormat)
      .tickSize(-innerWidth)
      .tickPadding(15);

    const g = selection.selectAll('.container').data([null]);

    const gEnter = g
      .enter()
      .append('g')
      .attr('class', 'container');

    gEnter
      .merge(g)
      .attr(
        'transform',
        `translate(${margin.left},${margin.top})`
      );

    const yAxisG = g.select('.y-axis');
    const yAxisGEnter = gEnter
      .append('g')
      .attr('class', 'y-axis');

    yAxisGEnter
      .merge(yAxisG)
      .call(yAxis)
      .selectAll('.domain')
      .remove();

    const xAxisG = g.select('.x-axis');
    const xAxisGEnter = gEnter
      .append('g')
      .attr('class', 'x-axis');

    xAxisGEnter
      .merge(xAxisG)
      .call(xAxis)
      .attr('transform', `translate(0,${innerHeight})`)
      .select('.domain')
      .remove();

    xAxisGEnter
      .append('text')
      .attr('class', 'text-label')
      .attr('y', 65)
      .attr('fill', 'black')
      .merge(xAxisG.select('.text-label'))
      .attr('x', innerWidth / 2)
      .text(xAxisLabel);

    yAxisGEnter
      .append('text')
      .attr('class', 'text-label')
      .attr('y', -70)
      .attr('fill', 'black')
      .attr('transform', `rotate(-90)`)
      .attr('text-anchor', `middle`)
      .merge(yAxisG.select('.text-label'))
      .attr('x', -innerHeight / 2)
      .text(yAxisLabel);

    const lineGenerator = d3.line()
      .x((d) => xScale(xValue(d)))
      .y((d) => yScale(yValue(d)))
      .curve(d3.curveBasis);

    const linePaths = g
      .merge(gEnter)
      .selectAll('.line-path')
      .data(nested);
    linePaths
      .enter()
      .append('path')
      .attr('class', 'line-path')
      .merge(linePaths)
      .attr('d', (d) => lineGenerator(d.values))
      .attr('stroke', (d) => colorScale(d.key));

    const selectedYearDate = parseYear(selectedYear);

    gEnter
      .append('line')
      .attr('class', 'selected-year-line')
      .attr('y1', 0)
      .merge(g.select('.selected-year-line'))
      .attr('x1', xScale(selectedYearDate))
      .attr('x2', xScale(selectedYearDate))
      .attr('y2', innerHeight);

    gEnter
      .append('text')
      .attr('class', 'title')
      .attr('y', -10)
      .merge(g.select('.title'))
      .text(title);

    gEnter
      .append('rect')
      .attr('class', 'mouse-interceptor')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .merge(g.select('.mouse-interceptor'))
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .on('mousemove', function () {
        const x = d3.mouse(this)[0];
        const hoverDate = xScale.invert(x);
        setSelectedYear(hoverDate.getFullYear());
      });
  };

  let selectedYear = 2018;
  const svg = d3.select('svg');
  const colorLegendG = svg.append('g');
  const lineChartG = svg.append('g');
  let data;
  const width = +svg.attr('width');
  const height = +svg.attr('height');
  const setSelectedYear = year =>{
  selectedYear = year;
    render();
  };

  const margin = {
    top: 50,
    right: 300,
    bottom: 80,
    left: 110,
  };
  const render = () => {
    const yValue = (d) => d.population;
    const lastYValue = (d) =>
      yValue(d.values[d.values.length - 1]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const colorValue = (d) => d.name;

    const nested = d3.nest()
      .key(colorValue)
      .entries(data)
      .sort((a, b) =>
        d3.descending(lastYValue(a), lastYValue(b))
      );

    colorScale.domain(nested.map((d) => d.key));

    lineChartG.call(lineChart, {
      colorScale,
      colorValue,
      yValue,
      xValue: (d) => d.year,
      xAxisLabel: 'Time',
      yAxisLabel: 'Population',
      title: 'World Population Estimates',
      circleRadius: 4,
      margin,
      width,
      height,
      data,
      nested,
      selectedYear,
      setSelectedYear
    });

    colorLegendG
      .attr('transform', `translate(680,100)`)
      .call(colorLegend, {
        colorScale,
        circleRadius: 15,
        spacing: 50,
        textOffset: 20,
      });
  };

  loadAndProcessData().then((loadedData) => {
    data = loadedData;
    render();
  });

}(d3));