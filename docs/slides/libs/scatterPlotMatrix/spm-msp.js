"use strict";
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class BrushSlider {
        constructor(scatterPlotMatrix, xOriented) {
            this.xOriented = false;
            this.dimIndexScale = d3.scalePoint();
            this.dimIndexScaleInvertFn = d3.scaleQuantize();
            this.scatterPlotMatrix = scatterPlotMatrix;
            this.xOriented = xOriented;
            this.sliderClass = this.xOriented ? "xSlider" : "ySlider";
            d3.select(scatterPlotMatrix.bindto + " .MultiPlot svg").append("g")
                .attr("class", this.sliderClass);
        }
        update() {
            this.updateDimIndexScale();
            d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass} .axisGroup`).remove();
            d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass} .brushDim`).remove();
            if (this.xOriented) {
                this.buildChainGroup();
            }
            // Create the slider axis
            const axisGenerator = this.xOriented ? d3.axisBottom(this.dimIndexScale) : d3.axisRight(this.dimIndexScale);
            const axis = d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass}`).append("g")
                .attr("pointer-events", "none")
                .attr("class", "axisGroup")
                // Tick Values set to none to have no overlayed names
                .call(axisGenerator.tickSize(0).tickFormat(() => ""));
            const dx = this.xOriented ? spm.ScatterPlotMatrix.margin.l : spm.ScatterPlotMatrix.margin.l + spm.ScatterPlotMatrix.margin.r + this.scatterPlotMatrix.width - 16;
            const dy = this.xOriented ? spm.ScatterPlotMatrix.margin.t / 4.0 : spm.ScatterPlotMatrix.margin.t;
            d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass}`)
                .attr("transform", `translate(${dx}, ${dy})`);
            this.createBrush();
            axis.append("line")
                .attr("class", "locatorLine")
                .style("display", "none")
                .attr("pointer-events", "none");
            // Adapt slider to dimensions
            this.adjustBrushSelection();
        }
        buildChainGroup() {
            const thisBS = this;
            d3.select(`${this.scatterPlotMatrix.bindto} .chainGroup`).remove();
            const chainGroup = d3.select(this.scatterPlotMatrix.bindto + " .MultiPlot svg").append("g")
                .attr("class", "chainGroup")
                .attr("transform", `translate(${spm.ScatterPlotMatrix.margin.l + spm.ScatterPlotMatrix.margin.r + this.scatterPlotMatrix.width - 16}, ${spm.ScatterPlotMatrix.margin.t / 4.0})`)
                .on("mousedown", function () {
                chainGroup.classed("mousedown", true);
                d3.select(window).on("mouseup", function () { chainGroup.classed("mousedown", false); });
            })
                .on("click", function () {
                thisBS.scatterPlotMatrix.brushSlidersLinked = !thisBS.scatterPlotMatrix.brushSlidersLinked;
                chainGroup.select("path")
                    .attr("transform", `translate(0, ${thisBS.scatterPlotMatrix.brushSlidersLinked ? 0 : -2})`);
                const begin = thisBS.scatterPlotMatrix.xVisibleDimIndex0;
                const end = thisBS.scatterPlotMatrix.xVisibleDimIndex0 + thisBS.scatterPlotMatrix.visibleDimsCount - 1;
                thisBS.scatterPlotMatrix.updateVisibleDimensions(begin, end, thisBS.xOriented);
                thisBS.adjustOtherBrushSelection();
            });
            chainGroup.append("path")
                .attr("d", "M-3,0L-3,-6A3,3 0 0,1 3,-6L3,-3")
                .attr("transform", `translate(0, ${thisBS.scatterPlotMatrix.brushSlidersLinked ? 0 : -2})`);
            chainGroup.append("rect")
                .attr("x", -5)
                .attr("y", -2)
                .attr("width", 10)
                .attr("height", 9);
        }
        updateDimIndexScale() {
            const spData = this.scatterPlotMatrix.spData;
            const size = this.xOriented ? this.scatterPlotMatrix.width : this.scatterPlotMatrix.height;
            this.dimIndexScale
                .domain(d3.range(spData.dimensions.length))
                .range([0, size]);
            this.dimIndexScaleInvertFn
                .domain([0, size])
                .range(d3.range(spData.dimensions.length));
        }
        centerBrush(indexCenter, moveBrush) {
            const spData = this.scatterPlotMatrix.spData;
            const sizeDimVisible = this.scatterPlotMatrix.visibleDimsCount;
            let sizeLeft = Math.round((sizeDimVisible - 1) / 2.0);
            let sizeRight = sizeDimVisible - 1 - sizeLeft;
            if (indexCenter - sizeLeft < 0) {
                sizeRight = sizeRight + (sizeLeft - indexCenter);
                sizeLeft = indexCenter;
            }
            if (indexCenter + sizeRight > spData.dimensions.length - 1) {
                sizeLeft = sizeLeft + (indexCenter + sizeRight - spData.dimensions.length + 1);
                sizeRight = spData.dimensions.length - 1 - indexCenter;
            }
            const begin = indexCenter - sizeLeft;
            const end = indexCenter + sizeRight;
            if (begin !== this.visibleDimIndex0() ||
                end !== this.visibleDimIndex0() + this.scatterPlotMatrix.visibleDimsCount - 1) {
                this.scatterPlotMatrix.updateVisibleDimensions(begin, end, this.xOriented);
                d3.select(this.scatterPlotMatrix.bindto + " .mspTooltip").style("display", "none");
            }
            if (moveBrush) {
                this.adjustBrushSelection();
                this.adjustOtherBrushSelection();
            }
        }
        mouseDown(mouse) {
            const dimIndex = this.dimIndexScaleInvertFn(mouse[this.xOriented ? 0 : 1]);
            if (dimIndex) {
                this.centerBrush(dimIndex, true);
                d3.event.stopPropagation();
            }
        }
        mouseMove(mouse) {
            const dimIndex = this.dimIndexScaleInvertFn(mouse[this.xOriented ? 0 : 1]);
            if (dimIndex !== undefined) {
                const line = this.xOriented ? [[mouse[0], -8], [mouse[0], 8]] : [[-8, mouse[1]], [8, mouse[1]]];
                d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass} .locatorLine`)
                    .style("display", null)
                    .attr("x1", line[0][0])
                    .attr("y1", line[0][1])
                    .attr("x2", line[1][0])
                    .attr("y2", line[1][1]);
                const mspDivNode = d3.select(this.scatterPlotMatrix.bindto + " .mspDiv").node();
                const parentBounds = (mspDivNode === null) ? null : mspDivNode.getBoundingClientRect();
                const xParent = (parentBounds === null) ? 0 : parentBounds.x;
                const yParent = (parentBounds === null) ? 0 : parentBounds.y;
                const overlayNode = d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass} .overlay`).node();
                const overlayBound = (overlayNode === null) ? null : overlayNode.getBoundingClientRect();
                const xOverlay = (overlayBound === null) ? 0 : overlayBound.x;
                const yOverlay = (overlayBound === null) ? 0 : overlayBound.y;
                d3.select(this.scatterPlotMatrix.bindto + " .mspTooltip").remove();
                const mspDiv = d3.select(this.scatterPlotMatrix.bindto + " .mspDiv");
                const dx = this.xOriented ? -xParent + mouse[0] + 15 : -xParent - 15;
                const dy = this.xOriented ? -yParent - 15 : -yParent + mouse[1] + 15;
                const tooltip = mspDiv.append("div")
                    .attr("class", "mspTooltip")
                    .style("display", "block")
                    .style("left", (xOverlay + dx) + "px")
                    .style("top", (yOverlay + dy) + "px");
                tooltip.append("div")
                    .html(this.scatterPlotMatrix.spData.columns[this.scatterPlotMatrix.spData.dimensions[dimIndex]].label);
            }
        }
        mouseExit() {
            d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass} .locatorLine`).style("display", "none");
            d3.select(this.scatterPlotMatrix.bindto + " .mspTooltip").style("display", "none");
        }
        // eslint-disable-next-line max-lines-per-function
        createBrush() {
            const thisBS = this;
            let inSelectionDrag;
            d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass}`).append("g")
                .attr("class", "brushDim")
                .call(this.buildBrushBehavior()
                .handleSize(4)
                .extent(this.xOriented
                ? [
                    [0, -10],
                    [thisBS.scatterPlotMatrix.width, 10]
                ]
                : [
                    [-10, 0],
                    [10, thisBS.scatterPlotMatrix.height]
                ])
                .on("brush", function () {
                const selection = d3.event.selection;
                if (inSelectionDrag) {
                    const brushCenter = (selection[0] + selection[1]) / 2.0;
                    const centerIndex = thisBS.dimIndexScaleInvertFn(brushCenter);
                    if (centerIndex) {
                        thisBS.centerBrush(centerIndex, false);
                    }
                }
                else {
                    const begin = thisBS.dimIndexScaleInvertFn(selection[0]);
                    const end = thisBS.dimIndexScaleInvertFn(selection[1]);
                    if (begin !== thisBS.visibleDimIndex0() ||
                        end !== thisBS.visibleDimIndex0() + thisBS.scatterPlotMatrix.visibleDimsCount - 1) {
                        thisBS.scatterPlotMatrix.updateVisibleDimensions(begin, end, thisBS.xOriented);
                    }
                }
                thisBS.adjustOtherBrushSelection();
            })
                .on("end", function () {
                inSelectionDrag = false;
                thisBS.adjustBrushSelection();
                thisBS.adjustOtherBrushSelection();
            }))
                .call(g => g.select(".overlay")
                // @ts-ignore
                .on("mousedown touchstart", function () { thisBS.mouseDown(d3.mouse(this)); })
                // @ts-ignore
                .on("mousemove", function () { thisBS.mouseMove(d3.mouse(this)); })
                // @ts-ignore
                .on("mouseout", function () { thisBS.mouseExit(d3.mouse(this)); }))
                .call(g => g.select(".selection")
                .on("mousedown", function () { inSelectionDrag = true; })
                .on("mouseup", function () { inSelectionDrag = false; }));
        }
        adjustBrushSelection() {
            // Adjust brush selection (to make it corresponds to the limits of the bands associated to each column)
            d3.select(`${this.scatterPlotMatrix.bindto} .${this.sliderClass} .brushDim`).call(this.buildBrushBehavior().move, [
                this.dimIndexScale(this.visibleDimIndex0()),
                this.dimIndexScale(this.visibleDimIndex0() + this.scatterPlotMatrix.visibleDimsCount - 1)
            ]);
        }
        adjustOtherBrushSelection() {
            // Adjust selection of the other brush
            const otherVisibleDimIndex = this.xOriented ? this.scatterPlotMatrix.yVisibleDimIndex0 : this.scatterPlotMatrix.xVisibleDimIndex0;
            const otherBrushBehavior = this.xOriented ? d3.brushY() : d3.brushX();
            const otherSlideClass = this.xOriented ? "ySlider" : "xSlider";
            d3.select(`${this.scatterPlotMatrix.bindto} .${otherSlideClass} .brushDim`).call(otherBrushBehavior.move, [
                this.dimIndexScale(this.scatterPlotMatrix.brushSlidersLinked ? this.visibleDimIndex0() : otherVisibleDimIndex),
                this.dimIndexScale(otherVisibleDimIndex + this.scatterPlotMatrix.visibleDimsCount - 1)
            ]);
        }
        // private equals(array1: Array<any>, array2: Array<any>) {
        //     return array1.length === array2.length && array1.every((value, index) => value === array2[index]);
        // }
        visibleDimIndex0() {
            return this.xOriented ? this.scatterPlotMatrix.xVisibleDimIndex0 : this.scatterPlotMatrix.yVisibleDimIndex0;
        }
        buildBrushBehavior() {
            return this.xOriented ? d3.brushX() : d3.brushY();
        }
    }
    spm.BrushSlider = BrushSlider;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class Column {
        constructor(dim, dimIndex, spData, label, categories, ioType) {
            this.dimIndex = dimIndex;
            this.dim = dim;
            this.label = label;
            this.categories = categories;
            this.myDomain = d3.extent(spData.sampleData, function (row) { return +row[dim]; });
            this.ioType = ioType;
            const data = spData.sampleData.map(function (row) { return row[dim]; });
            this.sd = d3.deviation(data);
            const sorteddata = data.filter(d => d !== null && !isNaN(d)).sort(d3.ascending);
            this.p25 = d3.quantile(sorteddata, 0.25);
            this.p75 = d3.quantile(sorteddata, 0.75);
        }
        domain() {
            if (typeof this.myDomain[0] === "undefined" || typeof this.myDomain[1] === "undefined") {
                console.error("Wrong domain for ", this.dim);
                return [0, 1];
            }
            if (this.categories === null) {
                return this.myDomain;
            }
            else {
                return [this.myDomain[0] - 0.4, this.myDomain[1] + 0.6];
            }
        }
        formatedRowValue(row) {
            return this.formatedValue(row[this.dim]);
        }
        formatedValue(value) {
            if (this.categories) {
                if (value >= 0 && value < this.categories.length) {
                    return Number.isInteger(value.valueOf()) ? this.categories[value.valueOf()].toString() : "";
                }
                console.warn(value, " is not valid, it should be between 0 and ", this.categories.length);
                return "";
            }
            else {
                return spm.ExpFormat.format(value);
            }
        }
        axisTicks() {
            if (this.categories) {
                return this.categories.length;
            }
            else {
                return 4;
            }
        }
        labelText() {
            return this.label.replace(/<br>/gi, " ");
        }
        isInput() {
            return this.ioType === Column.INPUT;
        }
        isOutput() {
            return this.ioType === Column.OUTPUT;
        }
    }
    Column.INPUT = "Input";
    Column.OUTPUT = "Output";
    spm.Column = Column;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class CorrPlot {
        constructor(spData, config) {
            this.width = 0;
            this.height = 0;
            this.axisVisibility = { xTitle: true, xValues: true, yTitle: true, yValues: true };
            this.repType = CorrPlot.CIRCLES_REP;
            this.spData = spData;
            this.bindto = config.bindto;
            this.index = config.index;
            this.xColumn = spData.columns[spData.dimensions[0]];
            this.yColumn = spData.columns[spData.dimensions[0]];
            this.zColumn = null;
            this.row = config.row;
            this.col = config.col;
            this.corrCsId = config.corrPlotCsId;
            this.categoricalCsId = config.categoricalCsId;
            this.axisVisibility = config.axisVisibility;
            this.repType = config.corrPlotType;
            this.catColorScale = spm.SpConst.CATEGORIAL_CS[this.categoricalCsId];
        }
        setXColumn(column) {
            this.xColumn = column;
        }
        setYColumn(column) {
            this.yColumn = column;
        }
        setZColumn(column) {
            this.zColumn = column;
        }
        formatXValue(value) {
            return this.xColumn.formatedValue(value);
        }
        formatYValue(value) {
            return this.yColumn.formatedValue(value);
        }
        formatZValue(value) {
            return this.zColumn === null ? "No Z axis" : this.zColumn.formatedValue(value);
        }
        draw(updateType) {
            const thisPlot = this;
            this.updateZScale();
            const plotSelection = this.plotSelection();
            plotSelection.select(".corrPlotArea").remove();
            const areaSelection = plotSelection.append("g")
                .attr("class", "corrPlotArea")
                .attr("transform", "translate(0," + CorrPlot.padding.t + ")");
            const cpBorder = areaSelection.append("rect")
                .attr("class", "cpBorder")
                .attr("width", this.width - CorrPlot.padding.r)
                .attr("height", this.height - CorrPlot.padding.t)
                .on("mouseover", function () {
                thisPlot.spData.dispatch.call(spm.SpData.HL_GRAPH_EVENT, undefined, thisPlot);
            })
                .on("mouseout", function () {
                const coord = d3.mouse(this);
                if (coord[0] < 0 || coord[0] > thisPlot.width
                    || coord[1] < 0 || coord[0] > thisPlot.width) {
                    thisPlot.spData.dispatch.call(spm.SpData.HL_GRAPH_EVENT, undefined, null);
                }
            });
            if (this.xColumn.categories === null && this.yColumn.categories === null) {
                if (this.repType === CorrPlot.CIRCLES_REP) {
                    this.drawCCTreemap(updateType, areaSelection);
                }
                else {
                    this.drawCorrValues(updateType, areaSelection);
                    cpBorder.classed("cpNaBorder", true);
                }
            }
            else {
                this.drawNA(updateType, areaSelection);
                cpBorder.classed("cpNaBorder", true);
            }
        }
        hlGraph(highlight) {
            const plotSelection = this.plotSelection();
            if (this.xColumn.categories === null && this.yColumn.categories === null) {
                plotSelection.select(".cpBorder")
                    .classed("hlGraph", highlight);
                // plotSelection.select("circle.Root")
                //     .classed("hlGraph", highlight);
            }
            else {
                plotSelection.select(".cpBorder")
                    .classed("hlGraph", highlight);
            }
        }
        plotSelection(plotSelection) {
            if (plotSelection) {
                return plotSelection;
            }
            const thisPlot = this;
            const mspGroup = d3.select(this.bindto + " .mspGroup");
            return mspGroup.selectAll(".corrPlot")
                .filter(function (plot) {
                return plot.row === thisPlot.row && plot.col === thisPlot.col;
            });
        }
        // eslint-disable-next-line max-lines-per-function
        drawCCTreemap(_updateType, areaSelection) {
            const thisPlot = this;
            const corrValues = this.corrValues();
            const packLayout = d3.pack()
                .size([this.width - CorrPlot.padding.r, this.height - CorrPlot.padding.t])
                .padding(2);
            const rootNode = d3.hierarchy(corrValues);
            rootNode.sum(function (d) {
                return Math.abs(d.value);
            });
            packLayout(rootNode);
            areaSelection
                .selectAll("circle")
                .data(rootNode.descendants())
                .enter()
                .append("circle")
                .attr("class", d => d.data.clazz)
                .attr("cx", d => {
                // @ts-ignore - x property added by 'd3.pack'
                const cx = d.x;
                if (isNaN(cx)) {
                    if (d.data.keptCount > 1) {
                        console.error(`corrPlot (${thisPlot.col}, ${thisPlot.row}), cx is NaN (data '${d.data.name}' has ${d.data.keptCount} kept values)`);
                    }
                    return 0;
                }
                return cx;
            })
                .attr("cy", d => {
                // @ts-ignore - x property added by 'd3.pack'
                const cy = d.y;
                if (isNaN(cy)) {
                    if (d.data.keptCount > 1) {
                        console.error(`corrPlot (${thisPlot.col}, ${thisPlot.row}), cy is NaN (data '${d.data.name}' has ${d.data.keptCount} kept values)`);
                    }
                    return 0;
                }
                return cy;
            })
                .attr("r", d => {
                // @ts-ignore - r property added by 'd3.pack'
                const r = d.r;
                if (isNaN(r)) {
                    if (d.data.keptCount > 1) {
                        console.error(`corrPlot (${thisPlot.col}, ${thisPlot.row}), r is NaN (data '${d.data.name}' has ${d.data.keptCount} kept values)`);
                    }
                    return 0;
                }
                return r;
            })
                .on("mouseover", function (node) {
                thisPlot.mouseoverCircle(this, node);
            })
                .on("mouseout", function () {
                thisPlot.mouseout();
            })
                .filter(d => d.data.clazz !== "Root" && d.data.clazz !== "Remaining")
                .attr("fill", function (d) {
                if (d.data.clazz === "All") {
                    return "grey";
                }
                const catIndex = +d.data.name;
                return thisPlot.catColorScale(catIndex);
            });
        }
        drawCorrValues(_updateType, areaSelection) {
            const thisPlot = this;
            const corrValues = this.corrValues().children.filter(cv => cv.clazz !== "Remaining");
            const isCategorial = (this.zColumn !== null && this.zColumn.categories);
            const fontSize = isCategorial
                ? (this.height / Math.max(8, corrValues.length)) + "px"
                : (this.height / 5) + "px";
            const contColorScale = d3.scaleSequential(spm.SpConst.CONTINUOUS_CS[this.corrCsId])
                .domain([-1, 1]);
            const text = areaSelection.selectAll("text").data(corrValues).enter()
                .append("text")
                .attr("class", "corrNumber")
                .attr("font-size", fontSize)
                .attr("dominant-baseline", "middle")
                .style("fill", cv => { var _a; return (_a = contColorScale(cv.value)) !== null && _a !== void 0 ? _a : spm.SpConst.CONTINUOUS_CS[this.corrCsId](0); })
                .on("mouseover", function (cv) {
                thisPlot.mouseoverText(this, cv);
            })
                .on("mouseout", function () {
                thisPlot.mouseout();
            });
            if (isCategorial) {
                const bandScale = d3.scaleBand()
                    .domain(d3.range(corrValues.length))
                    .range([CorrPlot.padding.t, this.height])
                    .paddingOuter(0.5);
                text.attr("x", CorrPlot.padding.r)
                    .attr("y", (_cv, i) => { var _a; return (_a = bandScale(i)) !== null && _a !== void 0 ? _a : 0; })
                    .text(cv => `${cv.name}: ${spm.ExpFormat.format(cv.value)}`);
            }
            else {
                text.attr("x", (this.width - CorrPlot.padding.r) / 2)
                    .attr("y", (this.height - CorrPlot.padding.t) / 2)
                    .attr("text-anchor", "middle")
                    .text(cv => `${spm.ExpFormat.format(cv.value)}`);
            }
        }
        mouseoverText(svgTextElement, corrValues) {
            this.spData.dispatch.call(spm.SpData.HL_GRAPH_EVENT, undefined, this);
            const mspDivNode = d3.select(this.bindto + " .mspDiv").node();
            const parentBounds = (mspDivNode === null) ? null : mspDivNode.getBoundingClientRect();
            const xParent = (parentBounds === null) ? 0 : parentBounds.x;
            const yParent = (parentBounds === null) ? 0 : parentBounds.y;
            const textBounds = svgTextElement.getBoundingClientRect();
            d3.select(this.bindto + " .mspTooltip").remove();
            const mspDiv = d3.select(this.bindto + " .mspDiv");
            const tooltip = mspDiv.append("div")
                .attr("class", "mspTooltip")
                .style("display", "block")
                .style("left", (textBounds.x - xParent) + "px")
                .style("top", (textBounds.y - yParent) + "px");
            tooltip.append("div")
                .attr("class", "title")
                .html("Correlation Values");
            switch (corrValues.clazz) {
                case "All":
                    this.updateTooltipWithAllCorrelation(corrValues);
                    break;
                case "Cat":
                    this.updateTooltipWithCatCorrelation(corrValues);
                    break;
                default:
                    break;
            }
            this.updateXYTooltip();
        }
        drawNA(_updateType, areaSelection) {
            const corrText = "NA";
            const fontSize = (this.height / 5) + "px";
            areaSelection.append("text")
                .attr("class", "naCorrNumber")
                .attr("x", (this.width - CorrPlot.padding.r) / 2)
                .attr("y", (this.height - CorrPlot.padding.t) / 2)
                .attr("font-size", fontSize)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(corrText);
        }
        // eslint-disable-next-line max-lines-per-function
        corrValues() {
            const corrValues = {
                name: "Root",
                clazz: "Root",
                children: [],
                value: NaN,
                pointsCount: NaN,
                keptCount: NaN
            };
            // About Pearson correlation for all points
            const corr = CorrPlot.getPearsonCorrelation(this.spData.cutData().map(row => row[this.xColumn.dim]), this.spData.cutData().map(row => row[this.yColumn.dim]));
            corrValues.children.push({
                name: "All",
                clazz: "All",
                children: [],
                value: corr,
                pointsCount: this.spData.sampleData.length,
                keptCount: this.spData.cutData().length
            });
            // About Pearson correlation for each category of points
            let corrCount = 1;
            let corrCumul = Math.abs(corr);
            const zColumn = this.zColumn;
            if (zColumn !== null && zColumn.categories) {
                const categories = zColumn.categories;
                categories.forEach((cat, i) => {
                    const filteredData = this.spData.cutData().filter(row => {
                        const catIndex = row[zColumn.dim];
                        return categories[catIndex] === cat;
                    });
                    const catCorr = CorrPlot.getPearsonCorrelation(filteredData.map(row => row[this.xColumn.dim]), filteredData.map(row => row[this.yColumn.dim]));
                    const catData = this.spData.sampleData.filter(row => {
                        const catIndex = row[zColumn.dim];
                        return categories[catIndex] === cat;
                    });
                    corrValues.children.push({
                        name: i.toString(),
                        clazz: "Cat",
                        children: [],
                        value: catCorr,
                        pointsCount: catData.length,
                        keptCount: filteredData.length
                    });
                    corrCount = corrCount + 1;
                    corrCumul = corrCumul + Math.abs(catCorr);
                });
            }
            // About circle representing total uncorrelation
            corrValues.children.push({
                name: "Remaining",
                clazz: "Remaining",
                children: [],
                value: corrCount - corrCumul,
                pointsCount: NaN,
                keptCount: NaN
            });
            return corrValues;
        }
        static rootNode(node) {
            let rootNode = node;
            while (rootNode.parent !== null) {
                rootNode = rootNode.parent;
            }
            return rootNode;
        }
        // eslint-disable-next-line max-lines-per-function
        mouseoverCircle(circle, node) {
            this.spData.dispatch.call(spm.SpData.HL_GRAPH_EVENT, undefined, this);
            const circleSelection = d3.select(circle);
            const mspDivNode = d3.select(this.bindto + " .mspDiv").node();
            const parentBounds = (mspDivNode === null) ? null : mspDivNode.getBoundingClientRect();
            const xParent = (parentBounds === null) ? 0 : parentBounds.x;
            const yParent = (parentBounds === null) ? 0 : parentBounds.y;
            const circleBound = circle.getBoundingClientRect();
            const r = +circleSelection.attr("r");
            d3.select(this.bindto + " .mspTooltip").remove();
            const mspDiv = d3.select(this.bindto + " .mspDiv");
            const tooltip = mspDiv.append("div")
                .attr("class", "mspTooltip")
                .style("display", "block")
                .style("left", (circleBound.x - xParent + r * Math.sqrt(3) + 10) + "px")
                .style("top", (circleBound.y - yParent + r * Math.sqrt(3)) + "px");
            tooltip.append("div")
                .attr("class", "title")
                .html("Correlation Circular Treemap");
            if (typeof node.data === "undefined") {
                const corrValuesArray = CorrPlot.rootNode(node).descendants().map(childNode => childNode.data);
                this.updateTooltipWithRootCorrelations(corrValuesArray);
                return;
            }
            switch (node.data.clazz) {
                case "All":
                    this.updateTooltipWithAllCorrelation(node.data);
                    break;
                case "Cat":
                    this.updateTooltipWithCatCorrelation(node.data);
                    break;
                case "Remaining": {
                    // this.updateTooltipWithRemainingCorrelation(node);
                    const corrValuesArray = CorrPlot.rootNode(node).descendants().map(childNode => childNode.data);
                    this.updateTooltipWithRootCorrelations(corrValuesArray);
                    break;
                }
                case "Root": {
                    const corrValuesArray = CorrPlot.rootNode(node).descendants().map(childNode => childNode.data);
                    this.updateTooltipWithRootCorrelations(corrValuesArray);
                    break;
                }
                default:
                    break;
            }
            this.updateXYTooltip();
        }
        updateXYTooltip() {
            const subTipDiv = d3.select(this.bindto + " .mspTooltip").append("div")
                .attr("class", "subTipDiv");
            subTipDiv.append("div")
                .html(`x: ${this.xColumn.label.replace(/<br>/gi, " ")}`);
            subTipDiv.append("div")
                .html(`y: ${this.yColumn.label.replace(/<br>/gi, " ")}`);
        }
        updateTooltipWithAllCorrelation(corrValues) {
            const subTipDiv = d3.select(this.bindto + " .mspTooltip").append("div")
                .attr("class", "subTipDiv");
            const color = "grey";
            subTipDiv.append("div")
                .html(`<span class='swatch' style='background:${color}'>&nbsp;</span> <span class='strongValue'>${spm.ExpFormat.format(corrValues.value)}</span>`);
            const zColumn = this.zColumn;
            if (zColumn !== null && zColumn.categories) {
                subTipDiv.append("div")
                    .html(`Correlation, whatever the value of ${zColumn.label.replace(/<br>/gi, " ")}`);
            }
            subTipDiv.append("div")
                .html(`Number of points: ${corrValues.keptCount} (cut points: ${corrValues.pointsCount - corrValues.keptCount})`);
        }
        updateTooltipWithCatCorrelation(corrValues) {
            const zColumn = this.zColumn;
            if (!zColumn || !zColumn.categories) {
                console.log("'mouseoverCircleCat' called, but Z column is not categorial");
                return;
            }
            const thisPlot = this;
            const subTipDiv = d3.select(this.bindto + " .mspTooltip").append("div")
                .attr("class", "subTipDiv");
            const category = zColumn.categories[+corrValues.name];
            const catIndex = +corrValues.name;
            const color = thisPlot.catColorScale(catIndex);
            subTipDiv.append("div")
                .html(`<span class='swatch' style='background:${color}'>&nbsp;</span> <span class='strongValue'>${spm.ExpFormat.format(corrValues.value)}</span>`);
            subTipDiv.append("div")
                .html(`Correlation when ${zColumn.label.replace(/<br>/gi, " ")} = ${category}`);
            subTipDiv.append("div")
                .html(`Number of points: ${corrValues.keptCount} (cut points: ${corrValues.pointsCount - corrValues.keptCount})`);
        }
        // private updateTooltipWithRemainingCorrelation(corrValues: CorrValues) {
        //     const tooltip = d3.select(this.bindto + " .mspTooltip");
        //     if (this.zColumn.categories) {
        //         tooltip.append("div")
        //             .html(`Σ(1 - |correlation|): ${ExpFormat.format(corrValues.value)}`);
        //     }
        //     else {
        //         tooltip.append("div")
        //             .html(`1 - |correlation|: ${ExpFormat.format(corrValues.value)}`);
        //     }
        // }
        updateTooltipWithRootCorrelations(corrValuesArray) {
            corrValuesArray.forEach(corrValues => {
                switch (corrValues.clazz) {
                    case "All": {
                        this.updateTooltipWithAllCorrelation(corrValues);
                        break;
                    }
                    case "Cat": {
                        this.updateTooltipWithCatCorrelation(corrValues);
                        break;
                    }
                    // case "Remaining": {
                    //     this.updateTooltipWithRemainingCorrelation(corrValues);
                    //     break;
                    // }
                    default:
                        break;
                }
            });
        }
        mouseout() {
            d3.select(this.bindto + " .mspTooltip").style("display", "none");
        }
        updateZScale() {
            const zColumn = this.zColumn;
            if (zColumn !== null && zColumn.categories !== null) {
                const zMax = zColumn.domain()[1];
                this.catColorScale = spm.SpConst.CATEGORIAL_CS[this.categoricalCsId]
                    .domain(d3.range(zMax));
            }
        }
        static getPearsonCorrelation(x, y) {
            // Source: https://memory.psych.mun.ca/tech/js/correlation.shtml
            let shortestArrayLength = 0;
            if (x.length === y.length) {
                shortestArrayLength = x.length;
            }
            else if (x.length > y.length) {
                shortestArrayLength = y.length;
                console.error("x has more items in it, the last " + (x.length - shortestArrayLength) + " item(s) will be ignored");
            }
            else {
                shortestArrayLength = x.length;
                console.error("y has more items in it, the last " + (y.length - shortestArrayLength) + " item(s) will be ignored");
            }
            let sum_x = 0;
            let sum_y = 0;
            let sum_xy = 0;
            let sum_x2 = 0;
            let sum_y2 = 0;
            for (let i = 0; i < shortestArrayLength; i++) {
                sum_x += x[i];
                sum_y += y[i];
                sum_xy += x[i] * y[i];
                sum_x2 += x[i] * x[i];
                sum_y2 += y[i] * y[i];
            }
            const step1 = (shortestArrayLength * sum_xy) - (sum_x * sum_y);
            const step2 = (shortestArrayLength * sum_x2) - (sum_x * sum_x);
            const step3 = (shortestArrayLength * sum_y2) - (sum_y * sum_y);
            const step4 = Math.sqrt(step2 * step3);
            const answer = step1 / step4;
            return answer;
        }
    }
    CorrPlot.CIRCLES_REP = "Circles";
    CorrPlot.TEXT_REP = "Text";
    CorrPlot.padding = { r: 10, t: 10 };
    spm.CorrPlot = CorrPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class DiagPlot {
        constructor(spData, config) {
            this.hidth = 0;
            this.height = 0;
            this.xScale = d3.scaleLinear();
            this.axisVisibility = { xTitle: true, xValues: true, yTitle: true, yValues: true };
            this.xAxis = d3.axisBottom(this.xScale)
                .tickFormat(DiagPlot.prototype.formatXValue.bind(this));
            this.yScale = d3.scaleLinear();
            this.yAxis = d3.axisLeft(this.yScale)
                .tickFormat(spm.ExpFormat.format);
            this.zScale = d3.scaleLinear();
            this.brush = null;
            this.dblClickTimeout = null;
            this.distribPlot = null;
            this.spData = spData;
            this.bindto = config.bindto;
            this.index = config.index;
            this.xColumn = spData.columns[spData.dimensions[0]];
            this.zColumn = spData.columns[spData.dimensions[0]];
            this.row = config.row;
            this.col = config.col;
            this.mouseMode = config.mouseMode;
            this.continuousCsId = config.continuousCsId;
            this.categoricalCsId = config.categoricalCsId;
            this.distribType = config.distribType;
            this.axisVisibility = config.axisVisibility;
            this.contColorScale = d3.scaleSequential(spm.SpConst.CONTINUOUS_CS[this.continuousCsId]);
            this.catColorScale = spm.SpConst.CATEGORIAL_CS[this.categoricalCsId];
        }
        setXColumn(column) {
            this.xColumn = column;
            this.distribPlot = null;
        }
        setZColumn(column) {
            this.zColumn = column;
        }
        formatXValue(value) {
            return this.xColumn.formatedValue(value);
        }
        formatZValue(value) {
            return this.zColumn === null ? "No Z axis" : this.zColumn.formatedValue(value);
        }
        draw(updateType) {
            this.updateXScale();
            this.updateZScale();
            const plotSelection = this.plotSelection();
            this.drawDistribPlots(updateType, plotSelection);
            this.updateYScale();
            this.drawSpRect(updateType, plotSelection);
            this.drawXAxis(updateType, plotSelection);
            this.drawYAxis(updateType, plotSelection);
            this.drawBrush(updateType, plotSelection);
        }
        drawSpRect(updateType, plotSelection) {
            if (updateType & DiagPlot.INIT) {
                // Add a rect to allow highligthing
                const xScaleRange = this.xScale.range();
                const yScaleRange = this.yScale.range();
                plotSelection.select(".spArea")
                    .append("rect")
                    .attr("class", "spRect")
                    .attr("x", xScaleRange[0])
                    .attr("y", yScaleRange[1])
                    .attr("width", xScaleRange[1] - xScaleRange[0])
                    .attr("height", yScaleRange[0] - yScaleRange[1]);
            }
        }
        hlGraph(highlight) {
            const plotSelection = this.plotSelection();
            plotSelection.select(".spRect")
                .classed("hlGraph", highlight);
        }
        // eslint-disable-next-line max-lines-per-function
        drawDistribPlots(updateType, plotSelection) {
            const distribGroup = plotSelection.select(".distribGroup");
            // Horizontal Distrib Plot
            if (updateType & DiagPlot.INIT || !this.distribPlot) {
                this.distribPlot = new spm.DistributionPlot(this.spData, this.xColumn, {
                    bindto: this.bindto,
                    orientation: spm.DistributionPlot.HOR,
                    mouseMode: this.mouseMode,
                    categoricalCsId: this.categoricalCsId,
                    distribType: this.distribType
                });
                this.distribPlot.generate(distribGroup, "#tile-clip");
            }
            if (updateType & (DiagPlot.INIT | DiagPlot.SHAPE | DiagPlot.RANGE | DiagPlot.DOMAIN | DiagPlot.Z_AXIS)) {
                const xDistribPlotRange = [this.height, DiagPlot.padding.t];
                this.distribPlot
                    .valuesScaleRange(this.xScale.range())
                    .computePlot(this.zColumn)
                    .distribScaleRange(xDistribPlotRange);
            }
            if (updateType & (DiagPlot.INIT | DiagPlot.PALETTE | DiagPlot.Z_AXIS)) {
                this.distribPlot.colorScale(this.catColorScale);
            }
            this.distribPlot.update(updateType, distribGroup);
        }
        updateXScale() {
            this.xScale
                .range([0, this.hidth - DiagPlot.padding.r])
                .domain(this.xColumn.domain());
            if (this.xColumn.categories === null) {
                this.xScale.nice();
            }
            this.xAxis.scale(this.xScale)
                .ticks(this.xColumn.axisTicks())
                .tickSize(-this.height + DiagPlot.padding.t);
        }
        updateYScale() {
            if (this.distribPlot === null) {
                console.error("updateYScale, 'distribPlot' is null");
            }
            else {
                this.yScale
                    .range([this.height, DiagPlot.padding.t])
                    .domain(this.distribPlot.useHistogramRep()
                    ? this.distribPlot.mainDistrib.cutHistoScale.domain()
                    : this.distribPlot.mainDistrib.cutDensityScale.domain())
                    .nice();
                this.yAxis.scale(this.yScale)
                    .ticks(5)
                    .tickSize(-this.hidth + DiagPlot.padding.r);
            }
        }
        updateZScale() {
            const zColumn = this.zColumn;
            if (zColumn === null) {
                return;
            }
            this.zScale
                .range([this.height - DiagPlot.padding.t, 0])
                .domain(zColumn.domain());
            if (zColumn.categories === null) {
                this.zScale.nice();
                const [zMin, zMax] = zColumn.domain();
                this.contColorScale = d3.scaleSequential(spm.SpConst.CONTINUOUS_CS[this.continuousCsId])
                    .domain([zMin, zMax]);
            }
            else {
                const zMax = zColumn.domain()[1];
                this.catColorScale = spm.SpConst.CATEGORIAL_CS[this.categoricalCsId]
                    .domain(d3.range(zMax));
            }
        }
        drawXAxis(updateType, plotSelection) {
            if (updateType & (DiagPlot.INIT | DiagPlot.RANGE | DiagPlot.DOMAIN | DiagPlot.SHAPE)) {
                const axesGroup = plotSelection.select(".axesGroup");
                if (updateType & DiagPlot.INIT) {
                    axesGroup.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + this.height + ")");
                    if (this.axisVisibility.xTitle) {
                        const x = (this.hidth - DiagPlot.padding.r) / 2;
                        const y = this.height + DiagPlot.margin.b / 2;
                        axesGroup.append("text")
                            .attr("class", "x scatterlabel")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("text-anchor", "middle")
                            .attr("dominant-baseline", "middle");
                    }
                }
                axesGroup.select(".x.axis").call(this.xAxis)
                    .selectAll(".tick text")
                    .attr("transform", "rotate(45)")
                    .style("text-anchor", "start")
                    .attr("display", this.axisVisibility.xValues ? "block" : "none");
                if (this.axisVisibility.xTitle) {
                    axesGroup.select(".x.scatterlabel").text(this.xColumn.label.replace(/<br>/gi, " "));
                }
            }
        }
        drawYAxis(updateType, plotSelection) {
            if (updateType & (DiagPlot.INIT | DiagPlot.RANGE | DiagPlot.DOMAIN | DiagPlot.SHAPE)) {
                const axesGroup = plotSelection.select(".axesGroup");
                if (updateType & DiagPlot.INIT) {
                    axesGroup.append("g")
                        .attr("class", "y axis");
                    if (this.axisVisibility.xTitle) {
                        const x = -DiagPlot.margin.l * 0.7;
                        const y = (this.height + DiagPlot.padding.t) / 2;
                        axesGroup.append("text")
                            .attr("class", "y scatterlabel")
                            .attr("transform", "translate(" + x + "," + y + ")rotate(270)")
                            .attr("dominant-baseline", "baseline")
                            .attr("text-anchor", "middle");
                    }
                }
                axesGroup.select(".y.axis").call(this.yAxis)
                    .selectAll(".tick text").attr("display", this.axisVisibility.yValues ? "block" : "none");
                if (this.axisVisibility.yTitle) {
                    axesGroup.select(".y.scatterlabel").text(this.xColumn.label.replace(/<br>/gi, " "));
                }
            }
        }
        fixBrush() {
            const plotSelection = this.plotSelection();
            if (this.mouseMode === spm.SpConst.tooltipMouse.key) {
                plotSelection.selectAll(".selection").style("display", "none");
                plotSelection.selectAll(".handle").style("display", "none");
                plotSelection.selectAll(".overlay").style("pointer-events", "auto");
            }
            else {
                plotSelection.selectAll(".selection").style("display", null);
                plotSelection.selectAll(".handle").style("display", null);
                plotSelection.selectAll(".overlay").style("pointer-events", "all");
            }
            if (this.mouseMode === spm.SpConst.filterMouse.key) {
                this.drawBrush(spm.ScatterPlot.RANGE, plotSelection);
            }
        }
        drawBrush(updateType, plotSelection) {
            const thisPlot = this;
            const spArea = plotSelection.select(".spArea");
            if (updateType & DiagPlot.INIT || !this.brush) {
                this.brush = d3.brush()
                    // .on("start", () => {
                    // })
                    .on("end", () => {
                    const brushZone = d3.event.selection;
                    thisPlot.brushend(brushZone);
                });
                const xExtent = [
                    thisPlot.xScale.range()[0],
                    thisPlot.yScale.range()[1]
                ];
                const yExtent = [
                    thisPlot.xScale.range()[1],
                    thisPlot.yScale.range()[0]
                ];
                this.brush.extent([xExtent, yExtent]);
                spArea.call(this.brush);
            }
        }
        // eslint-disable-next-line max-lines-per-function
        brushend(brushZone) {
            if (!this.brush) {
                return;
            }
            const thisPlot = this;
            if (this.mouseMode === spm.SpConst.zoomMouse.key) {
                // zoom on selected zone, or unzoom when a double-click is detected
                if (!brushZone && !this.dblClickTimeout) {
                    this.dblClickTimeout = setTimeout(function () {
                        thisPlot.dblClickTimeout = null;
                    }, spm.SpConst.dblClickDelay);
                    return;
                }
                const plotSelection = this.plotSelection();
                if (brushZone) {
                    this.xScale.domain([brushZone[0][0], brushZone[1][0]].map(this.xScale.invert));
                    this.yScale.domain([brushZone[1][1], brushZone[0][1]].map(this.yScale.invert));
                    plotSelection.select(".spArea").call(this.brush.move, null);
                }
                else {
                    this.xScale.domain(this.xColumn.domain());
                    if (this.distribPlot) {
                        this.yScale.domain(this.distribPlot.mainDistrib.cutDensityScale.domain());
                    }
                }
                if (this.xColumn.categories === null) {
                    this.xScale.nice();
                }
                // Zoom for axes
                this.drawXAxis(DiagPlot.DOMAIN, plotSelection);
                this.drawYAxis(DiagPlot.DOMAIN, plotSelection);
                // Zoom for brush
                this.drawBrush(DiagPlot.DOMAIN, plotSelection);
                // Zoom for distribution plot
                if (this.distribPlot) {
                    this.distribPlot.valuesScale.domain(this.xScale.domain());
                    this.distribPlot.update(DiagPlot.DOMAIN, plotSelection.select(".distribGroup"));
                }
            }
        }
        plotSelection(plotSelection) {
            if (plotSelection) {
                return plotSelection;
            }
            const thisPlot = this;
            const mspGroup = d3.select(this.bindto + " .mspGroup");
            return mspGroup.selectAll(".diagPlot")
                .filter(function (plot) {
                return plot.row === thisPlot.row && plot.col === thisPlot.col;
            });
        }
        distribRepChange(newType) {
            this.distribType = newType;
            if (this.distribPlot) {
                this.distribPlot.distribType = newType;
            }
            const plotSelection = this.plotSelection();
            this.drawDistribPlots(DiagPlot.SHAPE, plotSelection);
            this.updateYScale();
            this.drawXAxis(DiagPlot.SHAPE, plotSelection);
            this.drawYAxis(DiagPlot.SHAPE, plotSelection);
        }
        changeMouseMode(mouseMode) {
            this.mouseMode = mouseMode;
            if (this.distribPlot) {
                this.distribPlot.mouseMode = mouseMode;
            }
        }
    }
    DiagPlot.padding = { r: 10, t: 10 };
    // static readonly padding = { l: 30, r: 10, b: 30, t: 10 };
    DiagPlot.margin = { l: 60, r: 10, b: 50, t: 5 };
    DiagPlot.cslRight = 30;
    DiagPlot.cslLeft = 10;
    DiagPlot.cslWidth = 20;
    DiagPlot.cslTotalWidth = DiagPlot.cslRight + DiagPlot.cslLeft + DiagPlot.cslWidth;
    DiagPlot.INIT = 1;
    DiagPlot.SHAPE = 1 << 1;
    DiagPlot.PALETTE = 1 << 2;
    DiagPlot.Z_AXIS = 1 << 3;
    DiagPlot.RANGE = 1 << 4;
    DiagPlot.DOMAIN = 1 << 5;
    spm.DiagPlot = DiagPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class DistributionData {
        constructor(distributionPlot, zCatDescription) {
            this.uncutDensityScale = d3.scaleLinear();
            this.uncutDensity = null;
            this.cutDensityScale = d3.scaleLinear();
            this.cutDensity = null;
            this.uncutHistoScale = d3.scaleLinear();
            this.uncutBins = null;
            this.cutHistoScale = d3.scaleLinear();
            this.cutBins = null;
            this.plot = distributionPlot;
            this.zCatDescription = zCatDescription;
        }
        computePlot(violinCatDescription) {
            this.violinCatDescription = violinCatDescription;
            // Compute uncut plot
            const filteredUncutData = this.filterData(this.plot.spData.sampleData);
            this.computeUncutPlot(filteredUncutData);
            // Compute cut plot
            const filteredCutData = this.filterData(this.plot.spData.cutData());
            this.computeCutPlot(filteredCutData);
            // Adjust domain between cut and uncut
            if (filteredCutData.length > filteredUncutData.length / 2.0) {
                if (this.plot.useDensityRep()) {
                    const max = d3.max([this.cutDensityScale.domain(), this.uncutDensityScale.domain()], d => d[1]);
                    if (max) {
                        this.uncutDensityScale.domain([0, max]);
                        this.cutDensityScale.domain([0, max]);
                    }
                }
                if (this.plot.useHistogramRep()) {
                    this.cutHistoScale.domain(this.uncutHistoScale.domain());
                }
            }
            return this;
        }
        filterData(data) {
            const violinCatDescription = this.violinCatDescription;
            const filtered = violinCatDescription
                ? data.filter(function (row) {
                    return row[violinCatDescription.column.dim] === violinCatDescription.catIndex;
                })
                : data;
            const zCatDescription = this.zCatDescription;
            return zCatDescription
                ? filtered.filter(function (row) {
                    return row[zCatDescription.column.dim] === zCatDescription.catIndex;
                })
                : filtered;
        }
        computeUncutPlot(uncutData) {
            const thisData = this;
            const data = uncutData.map(function (row) { return row[thisData.plot.column.dim]; });
            if (this.plot.useDensityRep()) {
                this.uncutDensity = this.computeDensityPlot(data, this.uncutDensityScale);
            }
            if (this.plot.useHistogramRep()) {
                this.uncutBins = this.computeHistogramPlot(data, this.uncutHistoScale);
            }
            return this;
        }
        computeCutPlot(cutData) {
            const thisData = this;
            const data = cutData.map(function (row) { return row[thisData.plot.column.dim]; });
            if (this.plot.useDensityRep()) {
                this.cutDensity = this.computeDensityPlot(data, this.cutDensityScale);
            }
            if (this.plot.useHistogramRep()) {
                this.cutBins = this.computeHistogramPlot(data, this.cutHistoScale);
            }
            return this;
        }
        computeDensityPlot(data, densityScale) {
            const bandwidth = 0.9 * Math.min(this.plot.column.sd, Math.abs(this.plot.column.p75 - this.plot.column.p25) / 1.34) * Math.pow(data.length, -0.2);
            const thresholds = this.plot.valuesScale.ticks(40);
            const density = DistributionData.kde(DistributionData.epanechnikov(bandwidth), thresholds, data);
            density.push([thresholds[thresholds.length - 1], 0]);
            density.unshift([thresholds[0], 0]);
            const densityMax = d3.max(density, point => point[1]);
            densityScale.domain([0, densityMax ? densityMax : 1]);
            return density;
        }
        computeHistogramPlot(data, histoScale) {
            let thresholds = this.plot.valuesScale.ticks(40);
            if (this.plot.column.categories) {
                thresholds = d3.range(spm.SpConst.CAT_RATIO * this.plot.column.categories.length)
                    .map(t => (t - 0.5) / spm.SpConst.CAT_RATIO);
            }
            const bins = d3.histogram()
                .domain(this.plot.valuesScale.domain())
                .thresholds(thresholds)(data);
            const binMax = d3.max(bins, bin => bin.length);
            histoScale.domain([0, binMax ? binMax : 1]);
            return bins;
        }
        distribScaleRange(range) {
            this.uncutDensityScale.range(range);
            this.uncutHistoScale.range(range);
            this.cutDensityScale.range(range);
            this.cutHistoScale.range(range);
            return this;
        }
        static kde(kernel, thresholds, data) {
            return thresholds.map(t => [t, d3.mean(data, d => kernel(t - d))]);
        }
        static epanechnikov(bandwidth) {
            return (x1) => {
                const x = x1 / bandwidth;
                return (Math.abs(x) <= 1) ? 0.75 * (1 - x * x) / bandwidth : 0;
            };
        }
    }
    spm.DistributionData = DistributionData;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class DistributionPlot {
        constructor(spData, column, dpConfig) {
            this.valuesScale = d3.scaleLinear();
            this.zColumn = null;
            this.bindto = dpConfig.bindto;
            this.spData = spData;
            this.mouseMode = dpConfig.mouseMode;
            this.distribType = dpConfig.distribType;
            this.column = column;
            this.orientation = dpConfig.orientation;
            this.valuesScale.domain(this.column.domain());
            if (this.column.categories === null) {
                this.valuesScale.nice();
            }
            this.mainDistrib = new spm.DistributionData(this);
            this.subDistribList = [];
            this.subColorScale = spm.SpConst.CATEGORIAL_CS[dpConfig.categoricalCsId];
        }
        generate(distribGroup, clipSelector) {
            const plotClass = this.orientation === DistributionPlot.HOR ? "hor distribPlot" : "ver distribPlot";
            const distribPlot = distribGroup.append("g").attr("class", plotClass);
            if (clipSelector) {
                distribPlot.attr("clip-path", "url(" + clipSelector + ")");
            }
            const cut = distribPlot.append("g").attr("class", "cut");
            const uncut = distribPlot.append("g").attr("class", "uncut");
            // About density plots
            cut.append("g").attr("class", "pdfGroup");
            cut.append("g").attr("class", "subPdfGroup");
            uncut.append("g").attr("class", "pdfGroup");
            uncut.append("g").attr("class", "subPdfGroup");
            // About histograms
            cut.append("g").attr("class", "histoGroup");
            cut.append("g").attr("class", "subHistoGroup");
            uncut.append("g").attr("class", "histoGroup");
            uncut.append("g").attr("class", "subHistoGroup");
            return this;
        }
        useDensityRep() {
            return (this.distribType & DistributionPlot.DENS_REP) !== 0 && this.column.categories === null;
        }
        useHistogramRep() {
            return (this.distribType & DistributionPlot.HISTO_REP) !== 0 || this.column.categories !== null;
        }
        colorScale(colorScale) {
            this.subColorScale = colorScale;
            return this;
        }
        update(updateType, distribGroup) {
            if (this.orientation === DistributionPlot.HOR) {
                this.updateHor(updateType, distribGroup);
            }
            else {
                this.updateVer(updateType, distribGroup);
            }
        }
        updateVer(_updateType, distribGroup) {
            this.updateVerDensityPlot(distribGroup, DistributionPlot.SUB_FILTER);
            this.updateVerDensityPlot(distribGroup, DistributionPlot.SUB_FILTER | DistributionPlot.CUT_FILTER);
            this.updateVerDensityPlot(distribGroup, DistributionPlot.CUT_FILTER);
            this.updateVerDensityPlot(distribGroup, DistributionPlot.NO_FILTER);
            this.updateVerHistogram(distribGroup, DistributionPlot.SUB_FILTER);
            this.updateVerHistogram(distribGroup, DistributionPlot.SUB_FILTER | DistributionPlot.CUT_FILTER);
            this.updateVerHistogram(distribGroup, DistributionPlot.CUT_FILTER);
            this.updateVerHistogram(distribGroup, DistributionPlot.NO_FILTER);
        }
        updateHor(_updateType, distribGroup) {
            this.updateHorDensityPlot(distribGroup, DistributionPlot.SUB_FILTER);
            this.updateHorDensityPlot(distribGroup, DistributionPlot.SUB_FILTER | DistributionPlot.CUT_FILTER);
            this.updateHorDensityPlot(distribGroup, DistributionPlot.CUT_FILTER);
            this.updateHorDensityPlot(distribGroup, DistributionPlot.NO_FILTER);
            this.updateHorHistogram(distribGroup, DistributionPlot.SUB_FILTER);
            this.updateHorHistogram(distribGroup, DistributionPlot.SUB_FILTER | DistributionPlot.CUT_FILTER);
            this.updateHorHistogram(distribGroup, DistributionPlot.CUT_FILTER);
            this.updateHorHistogram(distribGroup, DistributionPlot.NO_FILTER);
        }
        plotVisibility(repType, filtering) {
            // if plot is about data coming from cutoff
            if (filtering & DistributionPlot.CUT_FILTER) {
                // if plot is about data coming from sub data
                if (filtering & DistributionPlot.SUB_FILTER) {
                    // plot is visible if sub data are available
                    return this.subDistribList.length !== 0;
                }
                else {
                    // plot is visible if sub data are not available
                    return this.subDistribList.length === 0;
                }
            }
            // if plot is not about data coming from cutoff
            else {
                // plot is not visible if data comes from sub data
                if (filtering & DistributionPlot.SUB_FILTER) {
                    return false;
                }
                else {
                    // if plot is an histogram
                    if (repType & DistributionPlot.HISTO_REP) {
                        // plot is visible if data have same domain for cut and uncut
                        return DistributionPlot.equalsDomain(this.mainDistrib.cutHistoScale.domain(), this.mainDistrib.uncutHistoScale.domain());
                    }
                    else {
                        // plot is visible if it's a density plot and data comes from all data
                        return true;
                    }
                }
            }
        }
        updateHorDensityPlot(distribGroup, filtering) {
            const thisPlot = this;
            const dataList = filtering & DistributionPlot.SUB_FILTER ? this.subDistribList : [this.mainDistrib];
            const cutClass = filtering & DistributionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const pdfClass = filtering & DistributionPlot.SUB_FILTER ? ".subPdfGroup" : ".pdfGroup";
            const plotGroup = distribGroup.select(`.hor ${cutClass} ${pdfClass}`);
            if (this.useDensityRep() && this.plotVisibility(DistributionPlot.DENS_REP, filtering)) {
                plotGroup.style("display", null);
            }
            else {
                plotGroup.style("display", "none");
                return;
            }
            const densPath = plotGroup.selectAll("path").data(dataList)
                .join(enter => enter.append("path"), update => update, exit => exit.remove())
                .attr("fill", (_data, dataIndex) => this.fillCollor(dataIndex, filtering))
                .attr("d", function (data) {
                let density = filtering & DistributionPlot.CUT_FILTER ? data.cutDensity : data.uncutDensity;
                if (!density) {
                    console.error("DistributionPlot.update called but no density computed");
                    density = [[0, 0]];
                }
                const densityScale = filtering & DistributionPlot.CUT_FILTER ? data.cutDensityScale : data.uncutDensityScale;
                const lineGenerator = d3.line()
                    .curve(d3.curveNatural)
                    .x(d => {
                    const x = thisPlot.valuesScale(d[0]);
                    return DistributionPlot.undef2Nan(x);
                })
                    .y(d => {
                    const y = densityScale(d[1]);
                    return DistributionPlot.undef2Nan(y);
                });
                return lineGenerator(density);
            });
            thisPlot.densMouse(densPath, filtering);
        }
        updateVerDensityPlot(distribGroup, filtering) {
            const thisPlot = this;
            const dataList = filtering & DistributionPlot.SUB_FILTER ? this.subDistribList : [this.mainDistrib];
            const cutClass = filtering & DistributionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const pdfClass = filtering & DistributionPlot.SUB_FILTER ? ".subPdfGroup" : ".pdfGroup";
            const plotGroup = distribGroup.select(`.ver ${cutClass} ${pdfClass}`);
            if (this.useDensityRep() && this.plotVisibility(DistributionPlot.DENS_REP, filtering)) {
                plotGroup.style("display", null);
            }
            else {
                plotGroup.style("display", "none");
                return;
            }
            const densPath = plotGroup.selectAll("path").data(dataList)
                .join(enter => enter.append("path"), update => update, exit => exit.remove())
                .attr("fill", (_data, dataIndex) => this.fillCollor(dataIndex, filtering))
                .attr("d", function (data) {
                let density = filtering & DistributionPlot.CUT_FILTER ? data.cutDensity : data.uncutDensity;
                if (!density) {
                    console.error("DistributionPlot.update called but no density computed");
                    density = [[0, 0]];
                }
                const densityScale = filtering & DistributionPlot.CUT_FILTER ? data.cutDensityScale : data.uncutDensityScale;
                const lineGenerator = d3.line()
                    .curve(d3.curveBasis)
                    .x(d => {
                    const x = densityScale(d[1]);
                    return DistributionPlot.undef2Nan(x);
                })
                    .y(d => {
                    const y = thisPlot.valuesScale(d[0]);
                    return DistributionPlot.undef2Nan(y);
                });
                return lineGenerator(density);
            });
            thisPlot.densMouse(densPath, filtering);
        }
        // eslint-disable-next-line max-lines-per-function
        densMouse(densPath, filtering) {
            if (filtering & DistributionPlot.CUT_FILTER) {
                const thisPlot = this;
                densPath
                    // eslint-disable-next-line max-lines-per-function
                    .on("mouseover", function (data, dataIndex) {
                    if (thisPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                        return;
                    }
                    const fill = d3.color(thisPlot.fillCollor(dataIndex, filtering));
                    if (fill) {
                        d3.select(this).attr("fill", fill.darker(3).toString());
                    }
                    thisPlot.pdfDisplay(filtering, dataIndex, false);
                    const tooltipLocation = thisPlot.tooltipLocation(this);
                    d3.select(thisPlot.bindto + " .mspTooltip").remove();
                    const mspDiv = d3.select(thisPlot.bindto + " .mspDiv");
                    const tooltip = mspDiv.append("div")
                        .attr("class", "mspTooltip")
                        .style("display", "block")
                        .style("left", tooltipLocation[0] + "px")
                        .style("top", tooltipLocation[1] + "px");
                    tooltip.append("div")
                        .attr("class", "title")
                        .html("Density Curve");
                    tooltip.append("div")
                        .html(`<span class="pdfColumn">for</span>: <span class="pdfColumnLabel">${thisPlot.column.labelText()}`);
                    if (data.violinCatDescription) {
                        const category = (data.violinCatDescription.column.categories)
                            ? data.violinCatDescription.column.categories[data.violinCatDescription.catIndex]
                            : "undefined";
                        const axisName = thisPlot.orientation === DistributionPlot.HOR ? "y axis" : "x axis";
                        tooltip.append("div")
                            .html(`where ${axisName} ${data.violinCatDescription.column.labelText()} = ${category}`);
                    }
                    if (filtering & spm.RegressionPlot.SUB_FILTER && thisPlot.column !== thisPlot.zColumn) {
                        if (thisPlot.zColumn) {
                            const category = (thisPlot.zColumn.categories)
                                ? thisPlot.zColumn.categories[dataIndex]
                                : "undefined";
                            tooltip.append("div")
                                .html(`where z axis ${thisPlot.zColumn.labelText()} = ${category}`);
                        }
                        else {
                            tooltip.append("div").html("where zaxis undefined = undefined");
                        }
                    }
                    if (filtering & spm.RegressionPlot.CUT_FILTER) {
                        const filteredUncutData = data.filterData(thisPlot.spData.sampleData);
                        const filteredCutData = data.filterData(thisPlot.spData.cutData());
                        tooltip.append("div")
                            .html(`used points: ${filteredCutData.length} (cut points: ${filteredUncutData.length - filteredCutData.length})`);
                    }
                })
                    .on("mouseout", function (_data, dataIndex) {
                    if (thisPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                        return;
                    }
                    d3.select(this).attr("fill", thisPlot.fillCollor(dataIndex, filtering));
                    thisPlot.pdfDisplay(filtering, dataIndex, true);
                    d3.select(thisPlot.bindto + " .mspTooltip").style("display", "none");
                });
            }
            else {
                densPath.style("pointer-events", "none");
            }
        }
        tooltipLocation(path) {
            const mspDivNode = d3.select(this.bindto + " .mspDiv").node();
            const parentBounds = (mspDivNode === null) ? null : mspDivNode.getBoundingClientRect();
            const xParent = (parentBounds === null) ? 0 : parentBounds.x;
            const yParent = (parentBounds === null) ? 0 : parentBounds.y;
            const elementBounds = path.getBoundingClientRect();
            const xRect = elementBounds.x;
            const yRect = elementBounds.y;
            const wRect = elementBounds.width;
            const hRect = elementBounds.height;
            return [xRect - xParent + wRect, yRect - yParent + hRect];
        }
        pdfDisplay(filtering, dataIndex, display) {
            const mspGroup = d3.select(this.bindto + " .mspGroup");
            const cutClass = filtering & DistributionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const pdfGroup = mspGroup.selectAll(`${cutClass} .pdfGroup`);
            const pdfPath = pdfGroup.selectAll("path")
                .filter(function (_data, dataIndex2) {
                return dataIndex2 !== dataIndex;
            });
            const subPdfGroup = mspGroup.selectAll(`${cutClass} .subPdfGroup`);
            const subPdfPath = subPdfGroup.selectAll("path")
                .filter(function (_data, dataIndex2) {
                return dataIndex2 !== dataIndex;
            });
            if (display) {
                pdfPath.style("display", null);
                subPdfPath.style("display", null);
            }
            else {
                pdfPath.style("display", "none");
                subPdfPath.style("display", "none");
            }
        }
        // eslint-disable-next-line max-lines-per-function
        updateHorHistogram(distribGroup, filtering) {
            const thisPlot = this;
            const dataList = filtering & DistributionPlot.SUB_FILTER ? this.subDistribList : [this.mainDistrib];
            const cutClass = filtering & DistributionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const histoClass = filtering & DistributionPlot.SUB_FILTER ? ".subHistoGroup" : ".histoGroup";
            const plotGroup = distribGroup.select(`.hor ${cutClass} ${histoClass}`);
            if (this.useHistogramRep() && this.plotVisibility(DistributionPlot.HISTO_REP, filtering)) {
                plotGroup.style("display", null);
            }
            else {
                plotGroup.style("display", "none");
                return;
            }
            const binsGroup = plotGroup.selectAll("g").data(dataList)
                .join(enter => enter.append("g"), update => update, exit => exit.remove());
            let baseLineList = [];
            // eslint-disable-next-line max-lines-per-function
            binsGroup.each(function (data, dataIndex) {
                let bins = filtering & DistributionPlot.CUT_FILTER ? data.cutBins : data.uncutBins;
                if (!bins) {
                    console.error("DistribtionPlot.update called but no histogram computed");
                    bins = [];
                }
                if (dataIndex === 0) {
                    baseLineList = bins.map(_bin => 0);
                }
                const histoScale = filtering & DistributionPlot.CUT_FILTER ? data.cutHistoScale : data.uncutHistoScale;
                const binsSelection = d3.select(this);
                binsSelection.selectAll("rect").remove();
                const binRect = binsSelection.selectAll("rect")
                    .data(bins).enter()
                    .append("rect")
                    .attr("fill", thisPlot.fillCollor(dataIndex, filtering))
                    .attr("x", function (bin) {
                    if (typeof bin.x0 === "undefined") {
                        console.error("bin.x0 is undefined");
                        return NaN;
                    }
                    const x = thisPlot.valuesScale(bin.x0);
                    return DistributionPlot.undef2Nan(x);
                })
                    .attr("y", function (bin, binIndex) {
                    const y = histoScale(bin.length + baseLineList[binIndex]);
                    return DistributionPlot.undef2Nan(y);
                })
                    .attr("width", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x0 or bin.x1 are undefined");
                        return NaN;
                    }
                    const x0 = DistributionPlot.undef2Nan(thisPlot.valuesScale(bin.x0));
                    const x1 = DistributionPlot.undef2Nan(thisPlot.valuesScale(bin.x1));
                    return x1 - x0;
                })
                    .attr("height", function (bin) {
                    const y0 = DistributionPlot.undef2Nan(histoScale(0));
                    const y1 = DistributionPlot.undef2Nan(histoScale(bin.length));
                    return y0 - y1;
                });
                thisPlot.histoMouse(binRect, filtering, data, dataIndex);
                bins.forEach((bin, binIndex) => {
                    baseLineList[binIndex] += bin.length;
                });
            });
        }
        // eslint-disable-next-line max-lines-per-function
        updateVerHistogram(distribGroup, filtering) {
            const thisPlot = this;
            const dataList = filtering & DistributionPlot.SUB_FILTER ? this.subDistribList : [this.mainDistrib];
            const cutClass = filtering & DistributionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const histoClass = filtering & DistributionPlot.SUB_FILTER ? ".subHistoGroup" : ".histoGroup";
            const plotGroup = distribGroup.select(`.ver ${cutClass} ${histoClass}`);
            if (this.useHistogramRep() && this.plotVisibility(DistributionPlot.HISTO_REP, filtering)) {
                plotGroup.style("display", null);
            }
            else {
                plotGroup.style("display", "none");
                return;
            }
            const binsGroup = plotGroup.selectAll("g").data(dataList)
                .join(enter => enter.append("g"), update => update, exit => exit.remove());
            let baseLineList = [];
            // eslint-disable-next-line max-lines-per-function
            binsGroup.each(function (data, dataIndex) {
                let bins = filtering & DistributionPlot.CUT_FILTER ? data.cutBins : data.uncutBins;
                if (!bins) {
                    console.error("DistribtionPlot.update called but no histogram computed");
                    bins = [];
                }
                if (dataIndex === 0) {
                    baseLineList = bins.map(_bin => 0);
                }
                const histoScale = filtering & DistributionPlot.CUT_FILTER ? data.cutHistoScale : data.uncutHistoScale;
                const binsSelection = d3.select(this);
                binsSelection.selectAll("rect").remove();
                const binRect = binsSelection.selectAll("rect")
                    .data(bins).enter()
                    .append("rect")
                    .attr("fill", thisPlot.fillCollor(dataIndex, filtering))
                    .attr("y", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x0 or bin.x1 are undefined");
                        return NaN;
                    }
                    const y0 = DistributionPlot.undef2Nan(thisPlot.valuesScale(bin.x0));
                    const y1 = DistributionPlot.undef2Nan(thisPlot.valuesScale(bin.x1));
                    return Math.min(y0, y1);
                })
                    .attr("x", function (_bin, binIndex) {
                    const x = histoScale(0 + baseLineList[binIndex]);
                    return DistributionPlot.undef2Nan(x);
                })
                    .attr("height", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x0 or bin.x1 are undefined");
                        return NaN;
                    }
                    const y1 = DistributionPlot.undef2Nan(thisPlot.valuesScale(bin.x1));
                    const y0 = DistributionPlot.undef2Nan(thisPlot.valuesScale(bin.x0));
                    return Math.abs(y1 - y0);
                })
                    .attr("width", function (bin) {
                    const x0 = DistributionPlot.undef2Nan(histoScale(0));
                    const x1 = DistributionPlot.undef2Nan(histoScale(bin.length));
                    return x1 - x0;
                });
                thisPlot.histoMouse(binRect, filtering, data, dataIndex);
                bins.forEach((bin, binIndex) => {
                    baseLineList[binIndex] += bin.length;
                });
            });
        }
        static undef2Nan(value) {
            return typeof value === "undefined" ? NaN : value;
        }
        // eslint-disable-next-line max-lines-per-function
        histoMouse(binRect, filtering, data, dataIndex) {
            if (filtering & DistributionPlot.CUT_FILTER) {
                const thisPlot = this;
                binRect
                    // eslint-disable-next-line max-lines-per-function
                    .on("mouseover", function (bin, binIndex) {
                    if (thisPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                        return;
                    }
                    const fill = d3.color(thisPlot.fillCollor(dataIndex, filtering));
                    if (fill) {
                        d3.select(this).attr("fill", fill.darker(3).toString());
                    }
                    const x0 = (typeof bin.x0 === "undefined") ? "undefined" : spm.ExpFormat.format(bin.x0);
                    const x1 = (typeof bin.x1 === "undefined") ? "undefined" : spm.ExpFormat.format(bin.x1);
                    const tooltipLocation = thisPlot.tooltipLocation(this);
                    d3.select(thisPlot.bindto + " .mspTooltip").remove();
                    const mspDiv = d3.select(thisPlot.bindto + " .mspDiv");
                    const tooltip = mspDiv.append("div")
                        .attr("class", "mspTooltip")
                        .style("display", "block")
                        .style("left", tooltipLocation[0] + "px")
                        .style("top", tooltipLocation[1] + "px");
                    tooltip.append("div")
                        .attr("class", "title")
                        .html("Histogram Bin");
                    if (thisPlot.column.categories) {
                        if (typeof bin.x0 !== "undefined" && typeof bin.x1 !== "undefined") {
                            const cat = thisPlot.column.categories[(bin.x0 + bin.x1) / 2];
                            tooltip.append("div")
                                .html(`<span class="binColumn">for</span>: <span class="binColumnLabel">${thisPlot.column.labelText()}</span> = <span class="domainValue">${cat}</span>`);
                        }
                    }
                    else {
                        tooltip.append("div")
                            .html(`<span class="binColumn">for</span>: <span class="binColumnValue">${thisPlot.column.labelText()}</span> ∈ <span class="domainValue">[${x0}, ${x1}[</span> `);
                    }
                    if (data.violinCatDescription) {
                        const category = (data.violinCatDescription.column.categories)
                            ? data.violinCatDescription.column.categories[data.violinCatDescription.catIndex]
                            : "undefined";
                        const axisName = thisPlot.orientation === DistributionPlot.HOR ? "y axis" : "x axis";
                        tooltip.append("div")
                            .html(`where ${axisName} ${data.violinCatDescription.column.labelText()} = ${category}`);
                    }
                    if (filtering & spm.RegressionPlot.SUB_FILTER && thisPlot.column !== thisPlot.zColumn) {
                        if (thisPlot.zColumn) {
                            const category = (thisPlot.zColumn.categories)
                                ? thisPlot.zColumn.categories[dataIndex]
                                : "undefined";
                            tooltip.append("div")
                                .html(`where z axis ${thisPlot.zColumn.labelText()} = ${category}`);
                        }
                        else {
                            tooltip.append("div").html("where zaxis undefined = undefined");
                        }
                    }
                    const uncutBins = data.uncutBins;
                    const cutInfo = uncutBins
                        ? `(cut points: ${uncutBins[binIndex].length - bin.length})`
                        : "";
                    tooltip.append("div")
                        .html(`<span class="binLength">=> number of points</span>: <span class="binLengthValue">${bin.length}</span> ${cutInfo}`);
                })
                    .on("mouseout", function () {
                    if (thisPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                        return;
                    }
                    d3.select(this).attr("fill", thisPlot.fillCollor(dataIndex, filtering));
                    d3.select(thisPlot.bindto + " .mspTooltip").style("display", "none");
                });
            }
            else {
                binRect.style("pointer-events", "none");
            }
        }
        fillCollor(dataIndex, filtering) {
            return filtering & DistributionPlot.SUB_FILTER ? this.subColorScale(dataIndex) : spm.SpConst.NO_CAT_COLOR;
        }
        computePlot(zColumn, violinCatDescription) {
            this.zColumn = zColumn;
            this.mainDistrib.computePlot(violinCatDescription);
            if (!zColumn || !zColumn.categories) {
                this.subDistribList = [];
            }
            else {
                this.subDistribList = zColumn.categories.map((_cat, i) => {
                    const zCatDescription = { column: zColumn, catIndex: i };
                    return new spm.DistributionData(this, zCatDescription);
                });
            }
            this.subDistribList.forEach(data => {
                data.computePlot(violinCatDescription);
                // Adjust domain between sub and main histogram
                if (data.plot.useHistogramRep()) {
                    data.cutHistoScale.domain(this.mainDistrib.cutHistoScale.domain());
                    data.uncutHistoScale.domain(this.mainDistrib.uncutHistoScale.domain());
                }
            });
            return this;
        }
        distribScaleRange(range) {
            this.mainDistrib.distribScaleRange(range);
            this.subDistribList.forEach(data => data.distribScaleRange(range));
            return this;
        }
        valuesScaleRange(range) {
            this.valuesScale.range(range);
            return this;
        }
        static equalsDomain(domain1, domain2) {
            return domain1[0] === domain2[0] && domain1[1] === domain2[1];
        }
    }
    DistributionPlot.HOR = "Horizontal";
    DistributionPlot.VER = "Vertical";
    DistributionPlot.NO_FILTER = 0;
    DistributionPlot.CUT_FILTER = 1;
    DistributionPlot.SUB_FILTER = 1 << 1;
    DistributionPlot.DENS_REP = 1;
    DistributionPlot.HISTO_REP = 1 << 1;
    spm.DistributionPlot = DistributionPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class ExpFormat {
        static sToExp(siValue) {
            const siStr = /[yzafpnµmkMGTPEZY]/.exec(siValue);
            if (siStr !== null) {
                return siValue.replace(siStr[0], ExpFormat.NONBREAKING_SPACE + "E" + ExpFormat.EXP_FORMATS[siStr[0]]);
            }
            return siValue;
        }
        static format(value) {
            if (value > 1e3 || value < -1e3 || (value < 1e-3 && value > -1e-3)) {
                return ExpFormat.sToExp(ExpFormat.f2s(value));
            }
            return ExpFormat.f3f(value);
        }
    }
    ExpFormat.NONBREAKING_SPACE = String.fromCharCode(0xA0);
    ExpFormat.EXP_FORMATS = {
        "y": "-24",
        "z": "-21",
        "a": "-18",
        "f": "-15",
        "p": "-12",
        "n": "-9",
        "µ": "-6",
        "m": "-3",
        "k": "3",
        "M": "6",
        "G": "9",
        "T": "12",
        "P": "15",
        "E": "18",
        "Z": "21",
        "Y": "24"
    };
    ExpFormat.f2s = d3.format(".2~s");
    ExpFormat.f3f = d3.format(".3~r");
    spm.ExpFormat = ExpFormat;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class MultipleScatterPlot {
        constructor(id, width, height) {
            this.width = 900;
            this.height = 750;
            this.scatterPlotList = [];
            this.mouseMode = spm.SpConst.tooltipMouse.key;
            this.legendVisibility = true;
            this.distribVisibility = true;
            this.distribType = 
            // DistributionPlot.DENS_REP;
            // DistributionPlot.DENS_REP |
            spm.DistributionPlot.HISTO_REP;
            this.regressionType = 0;
            // RegressionPlot.LOESS_REP;
            // RegressionPlot.LOESS_REP |
            // RegressionPlot.LINEAR_REP;
            this.continuousCsId = spm.SpConst.CONTINUOUS_CS_IDS[0];
            this.categoricalCsId = spm.SpConst.CATEGORIAL_CS_IDS[0];
            this.dispatch = d3.dispatch(MultipleScatterPlot.PLOT_EVENT);
            this.bindto = "#" + id;
            this.setSize(width, height);
            this.visibilityPad = new spm.VisibilityPad(this);
            this.selectionPad = new spm.SelectionPad(this);
        }
        resize(width, height) {
            this.setSize(width, height);
            d3.select(this.bindto + " .MultiPlot svg")
                .attr("width", this.width + MultipleScatterPlot.margin.l + MultipleScatterPlot.margin.r)
                .attr("height", this.height + MultipleScatterPlot.margin.b + MultipleScatterPlot.margin.t);
            this.removePlots();
            this.updatePlots(spm.ScatterPlot.INIT);
        }
        setSize(width, height) {
            this.width = width - MultipleScatterPlot.margin.l - MultipleScatterPlot.margin.r;
            this.height = height - MultipleScatterPlot.margin.b - MultipleScatterPlot.margin.t;
        }
        removePlots() {
            this.scatterPlotList.forEach(plot => {
                plot.removePlot();
            });
        }
        id() {
            return this.bindto.substring(1);
        }
        generate(config) {
            if (d3.select(this.bindto).empty()) {
                throw new Error("'bindto' dom element not found:" + this.bindto);
            }
            this.scatterPlotList.splice(0, this.scatterPlotList.length);
            this.initData(config);
            this.buildMainDomElements(config);
            this.visibilityPad.generate(config.visibilityPadId);
            this.selectionPad.generate(config.selectionPadId).update();
            this.appendPlotSvg();
            this.appendDistribRepSelect();
            this.appendAxesSelectors();
            this.initLegendVisibilityCB();
            this.initZAxisUsedCB();
            this.appendMouseModeSelect();
            this.initRegressionCB();
            this.updatePlots(spm.ScatterPlot.INIT);
            this.selectionPad.sendSelectionEvent();
            return this;
        }
        on(type, callback) {
            // @ts-ignore
            this.dispatch.on(type, callback);
        }
        // eslint-disable-next-line max-lines-per-function
        initData(config) {
            if (!config.continuousCS) {
                this.continuousCsId = spm.SpConst.CONTINUOUS_CS_IDS[0];
            }
            else if (spm.SpConst.CONTINUOUS_CS_IDS.includes(config.continuousCS)) {
                this.continuousCsId = config.continuousCS;
            }
            else {
                console.log("Unknown continuous color scale: " + config.continuousCS);
            }
            if (!config.categoricalCS) {
                this.categoricalCsId = spm.SpConst.CATEGORIAL_CS_IDS[0];
            }
            else if (spm.SpConst.CATEGORIAL_CS_IDS.includes(config.categoricalCS)) {
                this.categoricalCsId = config.categoricalCS;
            }
            else {
                console.log("Unknown categorical color scale: " + config.categoricalCS);
            }
            if (!config.distribType) {
                this.distribType = 2;
            }
            else if ([0, 1, 2, 3].includes(config.distribType)) {
                this.distribType = config.distribType;
            }
            else {
                console.log("Unknown distribType: " + config.distribType);
            }
            if (!config.regressionType) {
                this.regressionType = 0;
            }
            else if ([0, 1, 2, 3].includes(config.regressionType)) {
                this.regressionType = config.regressionType;
            }
            else {
                console.log("Unknown regressionType: " + config.regressionType);
            }
            this.spData = new spm.SpData(config);
            this.spData.initFromRowFilter(this.scatterPlotList);
            this.spData.on(spm.SpData.ROW_FILTER_EVENT, MultipleScatterPlot.prototype.rowFilterChange.bind(this));
            for (let j = 0; j < MultipleScatterPlot.grid.nRow; j++) {
                for (let i = 0; i < MultipleScatterPlot.grid.nCol; i++) {
                    this.pushNewSP(i, j);
                }
            }
            this.initAxes(config);
        }
        initAxes(config) {
            if (this.checkAxeConfig(config.xAxisDim, "config.xAxisDim")) {
                for (let i = 0; i < this.scatterPlotList.length; i++) {
                    if (typeof config.xAxisDim === "string") {
                        this.scatterPlotList[i].setXColumn(this.spData.columns[config.xAxisDim]);
                    }
                    if (Array.isArray(config.xAxisDim)) {
                        this.scatterPlotList[i].setXColumn(this.spData.columns[config.xAxisDim[i]]);
                    }
                }
            }
            if (this.checkAxeConfig(config.yAxisDim, "config.yAxisDim")) {
                for (let i = 0; i < this.scatterPlotList.length; i++) {
                    if (typeof config.yAxisDim === "string") {
                        this.scatterPlotList[i].setYColumn(this.spData.columns[config.yAxisDim]);
                    }
                    if (Array.isArray(config.yAxisDim)) {
                        this.scatterPlotList[i].setYColumn(this.spData.columns[config.yAxisDim[i]]);
                    }
                }
            }
            if (this.checkAxeConfig(config.zAxisDim, "config.zAxisDim")) {
                for (let i = 0; i < this.scatterPlotList.length; i++) {
                    if (typeof config.zAxisDim === "string") {
                        this.scatterPlotList[i].setZColumn(this.spData.columns[config.zAxisDim]);
                    }
                    if (Array.isArray(config.zAxisDim)) {
                        this.scatterPlotList[i].setZColumn(this.spData.columns[config.zAxisDim[i]]);
                    }
                }
            }
        }
        checkAxeConfig(configDim, configLabel) {
            if (typeof configDim === "string" &&
                typeof this.spData.columns[configDim] === "undefined") {
                console.log(`Unknown '${configLabel}':${configDim}`);
                return false;
            }
            if (Array.isArray(configDim)) {
                if (configDim.length !== 9) {
                    console.log(`'${configLabel}' is an array but its length is not 9`);
                    return false;
                }
                for (let i = 0; i < 9; i++) {
                    if (typeof configDim[i] === "string" &&
                        typeof this.spData.columns[configDim[i]] === "undefined") {
                        console.log(`Unknown '${configLabel}[${i}]':${configDim[i]}`);
                        return false;
                    }
                }
            }
            return true;
        }
        rowFilterChange() {
            this.spData.initFromRowFilter(this.scatterPlotList);
            this.scatterPlotList.forEach(plot => {
                const plotSelection = plot.plotSelection();
                plot.drawRegressionPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                plot.drawDistribPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                plot.drawVerViolinPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                plot.drawHorViolinPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                if (plotSelection.size() !== 0) {
                    plot.drawCanvas(false, plotSelection);
                }
            });
        }
        pushNewSP(i, j) {
            const scatterPlot = new spm.ScatterPlot(this.spData, {
                bindto: this.bindto,
                index: i + MultipleScatterPlot.grid.nCol * j,
                row: j,
                col: i,
                regressionType: this.regressionType,
                mouseMode: this.mouseMode,
                continuousCsId: this.continuousCsId,
                categoricalCsId: this.categoricalCsId,
                distribVisibility: this.distribVisibility,
                distribType: this.distribType,
                corrPlotType: "unused",
                corrPlotCsId: "unused",
                axisVisibility: {
                    xTitle: true,
                    xValues: true,
                    yTitle: true,
                    yValues: true
                }
            });
            this.scatterPlotList.push(scatterPlot);
        }
        // eslint-disable-next-line max-lines-per-function
        buildMainDomElements(config) {
            const controlWidgets = config.controlWidgets ? config.controlWidgets : false;
            d3.select(this.bindto + " .mspDiv").remove();
            const mspDiv = d3.select(this.bindto).append("div")
                .attr("class", "mspDiv")
                .classed("withWidgets", controlWidgets)
                .classed("withoutWidgets", !controlWidgets);
            const controlDiv = mspDiv.append("div").attr("class", "controlDiv");
            const optionalPlotsDiv = controlDiv.append("div")
                .attr("class", "optionalPlotsDiv");
            optionalPlotsDiv.append("div")
                .attr("class", "distribRepDiv")
                .html("Distribution Representation: <span class=\"distribRepSelect\"></span>");
            optionalPlotsDiv.append("div")
                .attr("class", "linearRegrDiv")
                .html(`<input type="checkbox" id="${this.id()}_linearRegr" name="linearRegr"> <label for="${this.id()}_linearRegr">Linear Regression</label>`);
            optionalPlotsDiv.append("div")
                .attr("class", "loessDiv")
                .html(`<input type="checkbox" id="${this.id()}_loess" name="loess"> <label for="${this.id()}_loess">Local Polynomial Regression</label>`);
            const visibilityDiv = controlDiv.append("div")
                .attr("class", "visibilityDiv");
            visibilityDiv.append("div")
                .attr("class", "visibilityLabel")
                .text("Toggle plots to display");
            visibilityDiv.append("div")
                .attr("class", "visibilityPad");
            const selectionDiv = controlDiv.append("div")
                .attr("class", "selectionDiv");
            selectionDiv.append("div")
                .attr("class", "selectionLabel")
                .text("Select plots to customize");
            selectionDiv.append("div")
                .attr("class", "selectionPad");
            const customDiv = controlDiv.append("div")
                .attr("class", "customDiv");
            customDiv.append("div")
                .attr("class", "customLabel")
                .text("Customize selected plots");
            customDiv.append("div")
                .attr("class", "xParamDiv")
                .html("X Axis: <span class=\"ParamSelect XAxis\"></span>");
            customDiv.append("div")
                .attr("class", "yParamDiv")
                .html("Y Axis: <span class=\"ParamSelect YAxis\"></span>");
            customDiv.append("div")
                .attr("class", "zParamDiv")
                .html("Z Axis: <span class=\"ParamSelect ZAxis\"></span>");
            const csDiv = controlDiv.append("div")
                .attr("class", "csDiv");
            csDiv.append("div")
                .attr("class", "legendVisibilityDiv")
                .html(`<input type="checkbox" id="${this.id()}_legendVisibility" name="legendVisibility" checked> <label for="${this.id()}_legendVisibility">Display Legend</label>`);
            csDiv.append("div")
                .attr("class", "zAxisUsedDiv")
                .html(`<input type="checkbox" id="${this.id()}_zAxisUsed" name="zAxisUsed" checked> <label for="${this.id()}_zAxisUsed">Use Z Axis</label>`);
            csDiv.append("div")
                .attr("class", "mouseModeDiv")
                .html("Mouse mode: <span class=\"mouseModeSelect\"></span>");
            mspDiv.append("div").attr("class", "MultiPlot");
        }
        appendPlotSvg() {
            const mspSvg = d3.select(this.bindto + " .MultiPlot")
                .append("svg")
                .attr("width", this.width + MultipleScatterPlot.margin.l + MultipleScatterPlot.margin.r)
                .attr("height", this.height + MultipleScatterPlot.margin.b + MultipleScatterPlot.margin.t);
            mspSvg.append("g")
                .attr("transform", "translate(" + MultipleScatterPlot.margin.l + "," + MultipleScatterPlot.margin.t + ")")
                .attr("class", "mspGroup");
            this.appendSvgDefs();
        }
        appendSvgDefs() {
            const svg = d3.select(this.bindto + " svg");
            const defs = svg.append("defs");
            defs.append("clipPath")
                .attr("id", "tile-clip")
                .append("rect");
            defs.append("clipPath")
                .attr("id", "x-clip")
                .append("rect");
            defs.append("clipPath")
                .attr("id", "y-clip")
                .append("rect");
        }
        // eslint-disable-next-line max-lines-per-function
        updatePlots(updateType) {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            if (updateType & (spm.ScatterPlot.INIT | spm.ScatterPlot.RANGE)) {
                const tileWidth = (this.width / this.visibilityPad.nCol)
                    - spm.ScatterPlot.margin.l - spm.ScatterPlot.margin.r
                    - (this.legendVisibility ? spm.ScatterPlot.cslTotalWidth : 0);
                const tileHeight = (this.height / thisMPlot.visibilityPad.nRow)
                    - spm.ScatterPlot.margin.t - spm.ScatterPlot.margin.b;
                this.scatterPlotList.forEach(plot => {
                    plot.height = tileHeight;
                    plot.width = tileWidth;
                });
                d3.select(this.bindto + " #tile-clip > rect")
                    .attr("x", tileWidth * this.distribRatio())
                    .attr("y", spm.ScatterPlot.padding.t)
                    .attr("width", tileWidth * (1 - this.distribRatio()) - spm.ScatterPlot.padding.r)
                    .attr("height", tileHeight * (1 - this.distribRatio()) - spm.ScatterPlot.padding.t);
                d3.select(this.bindto + " #x-clip > rect")
                    .attr("x", tileWidth * this.distribRatio())
                    .attr("y", tileHeight * (1 - this.distribRatio()))
                    .attr("width", tileWidth * (1 - this.distribRatio()) - spm.ScatterPlot.padding.r)
                    .attr("height", tileHeight * this.distribRatio());
                d3.select(this.bindto + " #y-clip > rect")
                    .attr("y", spm.ScatterPlot.padding.t)
                    .attr("width", tileWidth * this.distribRatio())
                    .attr("height", tileHeight * (1 - this.distribRatio()) - spm.ScatterPlot.padding.t);
            }
            if (updateType & spm.ScatterPlot.INIT) {
                const scatterPlot = mspGroup.selectAll(".scatterPlot")
                    .data(this.visibilityPad.visibleScatterPlots())
                    .enter().append("g")
                    .attr("class", "scatterPlot")
                    .attr("transform", function (plot) {
                    return `translate(${thisMPlot.xScatterPlot(plot)}, ${thisMPlot.yScatterPlot(plot)})`;
                });
                scatterPlot.append("g")
                    .attr("class", "axesGroup");
                scatterPlot.append("g")
                    .attr("class", "spArea")
                    .attr("clip-path", "url(#tile-clip)");
                scatterPlot.append("g")
                    .attr("class", "distribGroup");
            }
            mspGroup.selectAll(".scatterPlot").each(function (plot) {
                plot.draw(updateType);
            });
            mspGroup.selectAll(".cslGroup").style("display", this.legendVisibility ? "block" : "none");
            if (updateType & spm.ScatterPlot.INIT) {
                this.fixBrush();
            }
        }
        xScatterPlot(plot) {
            const vcell = this.visibilityPad.vcell(plot);
            return vcell.vcol * this.width / this.visibilityPad.nCol + spm.ScatterPlot.margin.l;
        }
        yScatterPlot(plot) {
            const vcell = this.visibilityPad.vcell(plot);
            return vcell.vrow * this.height / this.visibilityPad.nRow + spm.ScatterPlot.margin.t;
        }
        distribRatio() {
            return this.distribVisibility
                ? spm.ScatterPlot.DISTRIB_RATIO
                : 0;
        }
        //************************************
        //********** Axes Selectors **********
        //************************************
        appendAxesSelectors() {
            const thisMPlot = this;
            d3.selectAll(this.bindto + " .ParamSelect").data(MultipleScatterPlot.axesClasses).
                append("select")
                .on("change", function () {
                const axisClass = d3.select(this).datum();
                switch (axisClass) {
                    case MultipleScatterPlot.axesClasses[0]:
                        thisMPlot.setXAxis(thisMPlot.spData.dimensions[this.selectedIndex]);
                        break;
                    case MultipleScatterPlot.axesClasses[1]:
                        thisMPlot.setYAxis(thisMPlot.spData.dimensions[this.selectedIndex]);
                        break;
                    case MultipleScatterPlot.axesClasses[2]:
                        thisMPlot.setZAxis(thisMPlot.spData.dimensions[this.selectedIndex]);
                        break;
                    default:
                        break;
                }
            })
                .selectAll("option")
                .data(this.spData.dimensions)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
        }
        //********************************************************************
        //********** About "LegendVisibility/ZAxisUsed" check boxes **********
        //********************************************************************
        initLegendVisibilityCB() {
            const thisMPlot = this;
            d3.select(`#${this.id()}_legendVisibility`).on("change", function () {
                thisMPlot.legendVisibility = d3.select(this).property("checked");
                // 'range' is to update when the visibility of color scale legend is changed
                thisMPlot.updatePlots(spm.ScatterPlot.RANGE);
            });
        }
        initZAxisUsedCB() {
            d3.select(`#${this.id()}_zAxisUsed`)
                .on("change", MultipleScatterPlot.prototype.updateZAxisFromGui.bind(this));
        }
        updateZAxisFromGui() {
            if (d3.select(`#${this.id()}_zAxisUsed`).property("checked")) {
                const zAxisSelectNode = d3.select(this.bindto + " .ParamSelect.ZAxis>select").node();
                if (zAxisSelectNode) {
                    this.setZAxis(this.spData.dimensions[zAxisSelectNode.selectedIndex]);
                }
            }
            else {
                this.setZAxis(null);
            }
        }
        changeLegendVisibility(visible) {
            this.legendVisibility = visible;
            // 'range' is to update when the visibility of color scale legend is changed
            this.updatePlots(spm.ScatterPlot.RANGE);
        }
        //******************************************************
        //********** "Tooltip/Filter/Zoom" select box **********
        //******************************************************
        appendMouseModeSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .mouseModeSelect").append("select")
                .on("change", MultipleScatterPlot.prototype.mouseModeChange.bind(thisMPlot))
                .selectAll("option")
                .data(spm.SpConst.mouseModeList)
                .enter().append("option")
                .text(function (d) { return d.label; })
                .attr("value", function (d) { return d.key; });
            this.mouseModeChange();
        }
        mouseModeChange() {
            const mouseModeSelect = d3.select(this.bindto + " .mouseModeSelect > select").node();
            if (mouseModeSelect) {
                this.changeMouseMode(mouseModeSelect.options[mouseModeSelect.selectedIndex].value);
            }
        }
        changeMouseMode(mouseMode) {
            this.mouseMode = mouseMode;
            this.scatterPlotList.forEach(plot => {
                plot.changeMouseMode(mouseMode);
            });
            const modeIndex = spm.SpConst.mouseModeList.findIndex(mode => mode.key === mouseMode);
            d3.select(this.bindto + " .mouseModeSelect > select")
                .property("selectedIndex", modeIndex);
            this.fixBrush();
        }
        fixBrush() {
            this.scatterPlotList.forEach(plot => {
                plot.fixBrush();
            });
        }
        //***************************************************************
        //********** About "distribRep/Regression" check boxes **********
        //***************************************************************
        appendDistribRepSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .distribRepSelect").append("select")
                .on("change", function () {
                const rep = spm.SpConst.distribRepList[this.selectedIndex];
                thisMPlot.distribType = rep.key === spm.SpConst.histogramRep.key ? spm.DistributionPlot.HISTO_REP : spm.DistributionPlot.DENS_REP;
                thisMPlot.scatterPlotList.forEach(plot => {
                    plot.distribRepChange(thisMPlot.distribType);
                });
            })
                .selectAll("option")
                .data(spm.SpConst.distribRepList)
                .enter().append("option")
                .text(function (d) { return d.label; })
                .attr("value", function (d) { return d.key; });
            const histoRep = (this.distribType & spm.DistributionPlot.HISTO_REP) ? spm.SpConst.histogramRep.key : spm.SpConst.densityRep;
            const repIndex = spm.SpConst.distribRepList.findIndex(distribRep => distribRep.key === histoRep);
            d3.select(this.bindto + " .distribRepSelect > select")
                .property("selectedIndex", repIndex);
        }
        initRegressionCB() {
            const thisMPlot = this;
            d3.select(`#${this.id()}_linearRegr`).on("change", function () {
                if (d3.select(this).property("checked")) {
                    thisMPlot.regressionType = thisMPlot.regressionType | spm.RegressionPlot.LINEAR_REP;
                }
                else {
                    thisMPlot.regressionType = thisMPlot.regressionType ^ spm.RegressionPlot.LINEAR_REP;
                }
                thisMPlot.scatterPlotList.forEach(plot => {
                    plot.regressionRepChange(thisMPlot.regressionType);
                });
            });
            d3.select(`#${this.id()}_loess`).on("change", function () {
                if (d3.select(this).property("checked")) {
                    thisMPlot.regressionType = thisMPlot.regressionType | spm.RegressionPlot.LOESS_REP;
                }
                else {
                    thisMPlot.regressionType = thisMPlot.regressionType ^ spm.RegressionPlot.LOESS_REP;
                }
                thisMPlot.scatterPlotList.forEach(plot => {
                    plot.regressionRepChange(thisMPlot.regressionType);
                });
            });
        }
        //**************************************************
        //********** API (called by R htmlwidget) **********
        //**************************************************
        setXAxis(dim) {
            this.selectionPad.setXAxis(dim);
        }
        setYAxis(dim) {
            this.selectionPad.setYAxis(dim);
        }
        setZAxis(dim) {
            this.selectionPad.setZAxis(dim);
        }
        setDistribType(distribType) {
            if (distribType & (spm.DistributionPlot.HISTO_REP | spm.DistributionPlot.DENS_REP)) {
                this.distribType = distribType;
                this.scatterPlotList.forEach(plot => {
                    plot.distribRepChange(distribType);
                });
            }
            else {
                console.log("Invalid distribution type code: " + distribType);
            }
        }
        setRegressionType(regressionType) {
            if (regressionType === 0 || regressionType & (spm.RegressionPlot.LINEAR_REP | spm.RegressionPlot.LOESS_REP)) {
                this.regressionType = regressionType;
                this.scatterPlotList.forEach(plot => {
                    plot.regressionRepChange(regressionType);
                });
            }
            else {
                console.log("Invalid regression type code: " + regressionType);
            }
        }
        setContinuousColorScale(continuousCsId) {
            if (spm.SpConst.CONTINUOUS_CS_IDS.includes(continuousCsId)) {
                this.continuousCsId = continuousCsId;
                this.scatterPlotList.forEach(plot => {
                    plot.continuousCsId = continuousCsId;
                });
                this.updatePlots(spm.ScatterPlot.PALETTE);
            }
            else {
                console.log("Unknown continuous color scale: " + continuousCsId);
            }
        }
        setCategoricalColorScale(categoricalCsId) {
            if (spm.SpConst.CATEGORIAL_CS_IDS.includes(categoricalCsId)) {
                this.categoricalCsId = categoricalCsId;
                this.scatterPlotList.forEach(plot => {
                    plot.categoricalCsId = categoricalCsId;
                });
                this.updatePlots(spm.ScatterPlot.PALETTE);
            }
            else {
                console.log("Unknown categorical color scale: " + categoricalCsId);
            }
        }
        getPlotConfig() {
            // TODO: 'dim' for Axes X ,Y and Z are not managed
            const allDimensions = d3.keys(this.spData.sampleData[0]);
            return {
                data: [],
                rowLabels: this.spData.rowLabels,
                controlWidgets: d3.select(this.bindto + " .mspDiv").classed("withWidgets"),
                categorical: allDimensions.map(dim => this.spData.columns[dim]
                    ? this.spData.columns[dim].categories
                    : null),
                inputColumns: allDimensions.map(dim => this.spData.columns[dim] && this.spData.columns[dim].ioType === spm.Column.INPUT),
                keptColumns: allDimensions.map(dim => this.spData.dimensions.includes(dim)),
                xAxisDim: null,
                yAxisDim: null,
                zAxisDim: null,
                distribType: this.distribType,
                regressionType: this.regressionType,
                columnLabels: allDimensions.map(dim => this.spData.columns[dim]
                    ? this.spData.columns[dim].label
                    : dim),
                continuousCS: this.continuousCsId,
                categoricalCS: this.categoricalCsId,
                visibilityPadId: "",
                selectionPadId: ""
            };
        }
    }
    MultipleScatterPlot.margin = { t: 15, r: 10, b: 0, l: 0 };
    MultipleScatterPlot.axesClasses = ["XAxis", "YAxis", "ZAxis"];
    MultipleScatterPlot.grid = { nCol: 3, nRow: 3 };
    MultipleScatterPlot.PLOT_EVENT = "plotEvent";
    MultipleScatterPlot.SELECTION_EVENT = "selectionChange";
    spm.MultipleScatterPlot = MultipleScatterPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class PointsPlot {
        constructor(scatterPlot) {
            this.scatterPlot = scatterPlot;
        }
        mouseover(row, i) {
            if (this.scatterPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                return;
            }
            const tooltipTitle = this.scatterPlot.spData.rowLabels
                ? this.scatterPlot.spData.rowLabels[i]
                : "Point " + (i + 1);
            d3.select(this.scatterPlot.bindto + " .mspTooltip").remove();
            const mspDiv = d3.select(this.scatterPlot.bindto + " .mspDiv");
            const tooltip = mspDiv.append("div")
                .attr("class", "mspTooltip")
                .style("display", "block")
                .style("left", (this.scatterPlot.xPlot + this.cx(row, i) + 10) + "px")
                .style("top", (this.scatterPlot.yPlot + this.cy(row, i) + 10) + "px");
            tooltip.append("div")
                .attr("class", "pointIndex title")
                .html(tooltipTitle);
            tooltip.append("div")
                .html(`<span class="xName">${this.scatterPlot.xColumn.labelText()}</span>: <span class="xValue">${this.scatterPlot.xColumn.formatedRowValue(row)}</span>`);
            tooltip.append("div")
                .html(`<span class="yName">${this.scatterPlot.yColumn.labelText()}</span>: <span class="yValue">${this.scatterPlot.yColumn.formatedRowValue(row)}</span>`);
            if (this.scatterPlot.zColumn !== null) {
                tooltip.append("div")
                    .attr("class", "zTooltip")
                    .html(`<span class="zName">${this.scatterPlot.zColumn.labelText()}</span>: <span class="zValue">${this.scatterPlot.zColumn.formatedRowValue(row)}</span>`);
            }
        }
        mouseout() {
            if (this.scatterPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                return;
            }
            d3.select(this.scatterPlot.bindto + " .mspTooltip").style("display", "none");
        }
        cx(row, i) {
            const cx = (this.scatterPlot.xColumn.categories === null)
                ? this.scatterPlot.xScale(row[this.scatterPlot.xColumn.dim])
                : this.scatterPlot.xScale(row[this.scatterPlot.xColumn.dim] + this.scatterPlot.spData.jitterXValues[i]);
            return typeof cx === "undefined" ? NaN : cx;
        }
        cy(row, i) {
            const cy = (this.scatterPlot.yColumn.categories === null)
                ? this.scatterPlot.yScale(row[this.scatterPlot.yColumn.dim])
                : this.scatterPlot.yScale(row[this.scatterPlot.yColumn.dim] + this.scatterPlot.spData.jitterYValues[i]);
            return typeof cy === "undefined" ? NaN : cy;
        }
        pointColor(row) {
            if (this.scatterPlot.zColumn !== null) {
                const pointColor = (this.scatterPlot.zColumn.categories === null)
                    ? this.scatterPlot.contColorScale(row[this.scatterPlot.zColumn.dim])
                    : this.scatterPlot.catColorScale(row[this.scatterPlot.zColumn.dim]);
                if (typeof pointColor !== "undefined") {
                    return pointColor;
                }
            }
            return spm.SpConst.LIGHTER_NO_CAT_COLOR;
        }
        drawCanvas(picking, plotSelection) {
            if (picking) {
                this.drawPCanvas();
            }
            else {
                this.drawDCanvas(plotSelection);
            }
        }
        // eslint-disable-next-line max-lines-per-function
        drawDCanvas(plotSelection) {
            const canvasSelector = this.scatterPlot.canvasSelector(false);
            const canvasNode = d3.select(canvasSelector).node();
            if (!canvasNode) {
                console.error("canvasNode is null");
                return;
            }
            const context2d = canvasNode.getContext("2d");
            if (!context2d) {
                console.error("context2d is null");
                return;
            }
            const thisPlot = this;
            const xScaleRange = this.scatterPlot.xScale.range();
            const yScaleRange = this.scatterPlot.yScale.range();
            const xPlot = -xScaleRange[0];
            const yPlot = -yScaleRange[1];
            context2d.globalAlpha = 0.5;
            this.scatterPlot.spData.sampleData
                .forEach(function (row, i) {
                if (thisPlot.scatterPlot.spData.cutRows[i]) {
                    return;
                }
                const cx = thisPlot.cx(row, i) + xPlot;
                const cy = thisPlot.cy(row, i) + yPlot;
                const r = spm.ScatterPlot.pointRadius;
                context2d.beginPath();
                context2d.arc(cx, cy, r, 0, 2 * Math.PI, false);
                context2d.fillStyle = "#ccc";
                context2d.fill();
            });
            this.scatterPlot.spData.sampleData
                .forEach(function (row, i) {
                if (!thisPlot.scatterPlot.spData.cutRows[i]) {
                    return;
                }
                const cx = thisPlot.cx(row, i) + xPlot;
                const cy = thisPlot.cy(row, i) + yPlot;
                const r = spm.ScatterPlot.pointRadius;
                context2d.beginPath();
                context2d.arc(cx, cy, r, 0, 2 * Math.PI, false);
                context2d.fillStyle = thisPlot.pointColor(row);
                context2d.fill();
            });
            const selection = this.scatterPlot.plotSelection(plotSelection)
                .selectAll(".selection");
            if (!selection.empty() && selection.style("display") !== "none") {
                const x = +selection.attr("x");
                const y = +selection.attr("y");
                const w = +selection.attr("width");
                const h = +selection.attr("heigth");
                context2d.beginPath();
                context2d.rect(x, y, w, h);
                context2d.fillStyle = "#777";
                context2d.strokeStyle = "#fff";
                context2d.fill();
            }
            const i = this.scatterPlot.spData.getHlPoint();
            if (i !== null) {
                const row = this.scatterPlot.spData.sampleData[i];
                const cx = thisPlot.cx(row, i) + xPlot;
                const cy = thisPlot.cy(row, i) + yPlot;
                const r = 2 * spm.ScatterPlot.pointRadius;
                context2d.beginPath();
                context2d.arc(cx, cy, r, 0, 2 * Math.PI, false);
                context2d.fillStyle = "#000";
                context2d.fill();
            }
        }
        // eslint-disable-next-line max-lines-per-function
        drawPCanvas() {
            const canvasSelector = this.scatterPlot.canvasSelector(true);
            const canvasNode = d3.select(canvasSelector).node();
            if (!canvasNode) {
                console.error("canvasNode is null");
                return;
            }
            const context2d = canvasNode.getContext("2d");
            if (!context2d) {
                console.error("context2d is null");
                return;
            }
            const thisPlot = this;
            const xScaleRange = this.scatterPlot.xScale.range();
            const yScaleRange = this.scatterPlot.yScale.range();
            const xPlot = -xScaleRange[0];
            const yPlot = -yScaleRange[1];
            this.scatterPlot.spData.sampleData
                .forEach(function (row, i) {
                if (thisPlot.scatterPlot.spData.cutRows[i]) {
                    return;
                }
                const size = 2 * spm.ScatterPlot.pointRadius;
                const x = Math.round(thisPlot.cx(row, i) + xPlot - spm.ScatterPlot.pointRadius);
                const y = Math.round(thisPlot.cy(row, i) + yPlot - spm.ScatterPlot.pointRadius);
                context2d.beginPath();
                context2d.rect(x, y, size, size);
                context2d.fillStyle = PointsPlot.pickingColor(i);
                context2d.fill();
            });
            this.scatterPlot.spData.sampleData
                .forEach(function (row, i) {
                if (!thisPlot.scatterPlot.spData.cutRows[i]) {
                    return;
                }
                const size = 2 * spm.ScatterPlot.pointRadius;
                const x = Math.round(thisPlot.cx(row, i) + xPlot - spm.ScatterPlot.pointRadius);
                const y = Math.round(thisPlot.cy(row, i) + yPlot - spm.ScatterPlot.pointRadius);
                context2d.beginPath();
                context2d.rect(x, y, size, size);
                context2d.fillStyle = PointsPlot.pickingColor(i);
                context2d.fill();
            });
        }
        static pickingColor(dataIndex) {
            const hex = "00000" + dataIndex.toString(16);
            const pickingColor = "#" + hex.substring(hex.length - 6);
            return pickingColor;
        }
    }
    spm.PointsPlot = PointsPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class RegressionData {
        constructor(regressionPlot, zFilter) {
            this.uncutLinearRegression = null;
            this.cutLinearRegression = null;
            this.uncutLoessRegression = null;
            this.cutLoessRegression = null;
            this.plot = regressionPlot;
            this.zFilter = zFilter;
        }
        computePlot() {
            const xDim = this.plot.scatterPlot.xColumn.dim;
            const yDim = this.plot.scatterPlot.yColumn.dim;
            // Compute uncut plot
            const filteredUncutData = this.filterData(this.plot.scatterPlot.spData.sampleData);
            if (this.plot.useLinearRep()) {
                // @ts-ignore
                this.uncutLinearRegression = d3.regressionLinear()
                    .x((d) => d[xDim])
                    .y((d) => d[yDim])(filteredUncutData);
            }
            if (this.plot.useLoessRep()) {
                // @ts-ignore
                this.uncutLoessRegression = d3.regressionLoess()
                    .x((d) => d[xDim])
                    .y((d) => d[yDim])
                    .bandwidth(RegressionData.bandwidth)(filteredUncutData);
            }
            // Compute cut plot
            const filteredCutData = this.filterData(this.plot.scatterPlot.spData.cutData());
            if (this.plot.useLinearRep()) {
                // @ts-ignore
                this.cutLinearRegression = d3.regressionLinear()
                    .x((d) => d[xDim])
                    .y((d) => d[yDim])(filteredCutData);
            }
            if (this.plot.useLoessRep()) {
                // @ts-ignore
                this.cutLoessRegression = d3.regressionLoess()
                    .x((d) => d[xDim])
                    .y((d) => d[yDim])
                    .bandwidth(RegressionData.bandwidth)(filteredCutData);
            }
            return this;
        }
        filterData(data) {
            return this.zFilter ? data.filter(this.zFilter) : data;
        }
    }
    RegressionData.bandwidth = 0.75;
    spm.RegressionData = RegressionData;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class RegressionPlot {
        constructor(scatterPlot) {
            this.scatterPlot = scatterPlot;
            this.mainRegr = new spm.RegressionData(this);
            this.subRegrList = [];
            this.subColorScale = spm.SpConst.CATEGORIAL_CS[this.scatterPlot.categoricalCsId];
        }
        generate(plotSelection) {
            const regrPlot = plotSelection.append("g").attr("class", "regressionPlots");
            const cut = regrPlot.append("g").attr("class", "cut");
            const uncut = regrPlot.append("g").attr("class", "uncut");
            // About linear regression
            cut.append("g").attr("class", "linearGroup");
            cut.append("g").attr("class", "subLinearGroup");
            uncut.append("g").attr("class", "linearGroup");
            uncut.append("g").attr("class", "subLinearGroup");
            // About loess regression
            cut.append("g").attr("class", "loessGroup");
            cut.append("g").attr("class", "subLoessGroup");
            uncut.append("g").attr("class", "loessGroup");
            uncut.append("g").attr("class", "subLoessGroup");
            return this;
        }
        useLinearRep() {
            return (this.scatterPlot.regressionType & RegressionPlot.LINEAR_REP) !== 0
                && this.scatterPlot.xColumn.categories === null
                && this.scatterPlot.yColumn.categories === null;
        }
        useLoessRep() {
            return (this.scatterPlot.regressionType & RegressionPlot.LOESS_REP) !== 0
                && this.scatterPlot.xColumn.categories === null
                && this.scatterPlot.yColumn.categories === null;
        }
        colorScale(colorScale) {
            this.subColorScale = colorScale;
            return this;
        }
        update(_updateType, regrGroup) {
            this.updateLinearPlot(regrGroup, RegressionPlot.SUB_FILTER);
            this.updateLinearPlot(regrGroup, RegressionPlot.SUB_FILTER | RegressionPlot.CUT_FILTER);
            this.updateLinearPlot(regrGroup, RegressionPlot.CUT_FILTER);
            this.updateLinearPlot(regrGroup, RegressionPlot.NO_FILTER);
            this.updateLoessPlot(regrGroup, RegressionPlot.SUB_FILTER);
            this.updateLoessPlot(regrGroup, RegressionPlot.SUB_FILTER | RegressionPlot.CUT_FILTER);
            this.updateLoessPlot(regrGroup, RegressionPlot.CUT_FILTER);
            this.updateLoessPlot(regrGroup, RegressionPlot.NO_FILTER);
        }
        plotVisibility(filtering) {
            // if plot is about data coming from cutoff
            if (filtering & RegressionPlot.CUT_FILTER) {
                // if plot is about data coming from sub data
                if (filtering & RegressionPlot.SUB_FILTER) {
                    // plot is visible if sub data are available
                    return this.subRegrList.length !== 0;
                }
                else {
                    return true;
                }
            }
            // if plot is not about data coming from cutoff
            else {
                return false;
            }
        }
        updateLinearPlot(regrGroup, filtering) {
            const thisPlot = this;
            const dataList = filtering & RegressionPlot.SUB_FILTER ? this.subRegrList : [this.mainRegr];
            const cutClass = filtering & RegressionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const linearClass = filtering & RegressionPlot.SUB_FILTER ? ".subLinearGroup" : ".linearGroup";
            const plotGroup = regrGroup.select(`${cutClass} ${linearClass}`);
            if (this.useLinearRep() && this.plotVisibility(filtering)) {
                plotGroup.style("display", null);
            }
            else {
                plotGroup.style("display", "none");
                return;
            }
            plotGroup.selectAll("line").data(dataList)
                .join(enter => enter.append("line"), update => update, exit => exit.remove())
                .attr("stroke-width", 4)
                .style("visibility", "hidden")
                .attr("stroke", (_data, i) => {
                if (!(filtering & RegressionPlot.CUT_FILTER)) {
                    return null;
                }
                if (filtering & RegressionPlot.SUB_FILTER) {
                    return thisPlot.subColorScale(i);
                }
                return thisPlot.scatterPlot.zColumn === null || thisPlot.scatterPlot.zColumn.categories === null
                    ? spm.SpConst.NO_CAT_COLOR
                    : spm.SpConst.LIGHTER_NO_CAT_COLOR;
            })
                .attr("x1", data => thisPlot.linearRegressionX1(data, filtering))
                .attr("x2", data => thisPlot.linearRegressionX2(data, filtering))
                .attr("y1", data => thisPlot.linearRegressionY1(data, filtering))
                .attr("y2", data => thisPlot.linearRegressionY2(data, filtering))
                .on("mouseover", function (regressionData, i) {
                thisPlot.mouseoverLinear(this, regressionData, i, filtering);
            })
                .on("mouseout", function () {
                thisPlot.mouseout(d3.select(this));
            });
        }
        linearRegressionX1(data, filtering) {
            const linearRegression = RegressionPlot.linearRegression(data, filtering);
            return this.xScale(linearRegression[0][0]);
        }
        linearRegressionX2(data, filtering) {
            const linearRegression = RegressionPlot.linearRegression(data, filtering);
            return this.xScale(linearRegression[1][0]);
        }
        linearRegressionY1(data, filtering) {
            const linearRegression = RegressionPlot.linearRegression(data, filtering);
            return this.yScale(linearRegression[0][1]);
        }
        linearRegressionY2(data, filtering) {
            const linearRegression = RegressionPlot.linearRegression(data, filtering);
            return this.yScale(linearRegression[1][1]);
        }
        mouseoverLinear(line, data, i, filtering) {
            if (this.scatterPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                return;
            }
            d3.select(line).style("visibility", "visible");
            const rSquared = (data.cutLinearRegression)
                ? spm.ExpFormat.format(data.cutLinearRegression.rSquared)
                : "Not computed";
            const tooltipLocation = this.tooltipLocation(line);
            d3.select(this.scatterPlot.bindto + " .mspTooltip").remove();
            const mspDiv = d3.select(this.scatterPlot.bindto + " .mspDiv");
            const tooltip = mspDiv.append("div")
                .attr("class", "mspTooltip")
                .style("display", "block")
                .style("left", tooltipLocation[0] + "px")
                .style("top", tooltipLocation[1] + "px");
            tooltip.append("div")
                .attr("class", "title")
                .html("Linear Regression");
            if (filtering & RegressionPlot.SUB_FILTER && this.scatterPlot.zColumn !== null) {
                const category = this.scatterPlot.zColumn.categories
                    ? this.scatterPlot.zColumn.categories[i]
                    : "undefined";
                tooltip.append("div")
                    .html(`where z axis ${this.scatterPlot.zColumn.labelText()} = ${category}`);
            }
            if (filtering & RegressionPlot.CUT_FILTER) {
                const filteredUncutData = data.filterData(this.scatterPlot.spData.sampleData);
                const filteredCutData = data.filterData(this.scatterPlot.spData.cutData());
                tooltip.append("div")
                    .html(`used points:${filteredCutData.length} (cut points: ${filteredUncutData.length - filteredCutData.length})`);
            }
            tooltip.append("div")
                .html(`<span class="r2">=> r2</span>: <span class="r2Value">${rSquared}</span>`);
        }
        tooltipLocation(path) {
            const mspDivNode = d3.select(this.scatterPlot.bindto + " .mspDiv").node();
            const parentBounds = (mspDivNode === null) ? null : mspDivNode.getBoundingClientRect();
            const xParent = (parentBounds === null) ? 0 : parentBounds.x;
            const yParent = (parentBounds === null) ? 0 : parentBounds.y;
            const elementBounds = path.getBoundingClientRect();
            const xRect = elementBounds.x;
            const yRect = elementBounds.y;
            const wRect = elementBounds.width;
            const hRect = elementBounds.height;
            return [xRect - xParent + wRect, yRect - yParent + hRect];
        }
        mouseout(lineSelection) {
            if (this.scatterPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                return;
            }
            lineSelection.style("visibility", "hidden");
            d3.select(this.scatterPlot.bindto + " .mspTooltip").style("display", "none");
        }
        // eslint-disable-next-line max-lines-per-function
        updateLoessPlot(regrGroup, filtering) {
            const thisPlot = this;
            const dataList = filtering & RegressionPlot.SUB_FILTER ? this.subRegrList : [this.mainRegr];
            const cutClass = filtering & RegressionPlot.CUT_FILTER ? ".cut" : ".uncut";
            const loessClass = filtering & RegressionPlot.SUB_FILTER ? ".subLoessGroup" : ".loessGroup";
            const plotGroup = regrGroup.select(`${cutClass} ${loessClass}`);
            if (this.useLoessRep() && this.plotVisibility(filtering)) {
                plotGroup.style("display", null);
            }
            else {
                plotGroup.style("display", "none");
                return;
            }
            plotGroup.selectAll("path").data(dataList)
                .join(enter => enter.append("path"), update => update, exit => exit.remove())
                .attr("stroke-width", 4)
                .style("visibility", "hidden")
                .attr("stroke", (_data, i) => {
                if (!(filtering & RegressionPlot.CUT_FILTER)) {
                    return null;
                }
                if (filtering & RegressionPlot.SUB_FILTER) {
                    return thisPlot.subColorScale(i);
                }
                return thisPlot.scatterPlot.zColumn === null || thisPlot.scatterPlot.zColumn.categories === null
                    ? spm.SpConst.NO_CAT_COLOR
                    : spm.SpConst.LIGHTER_NO_CAT_COLOR;
            })
                .attr("d", function (data) {
                const loessRegression = RegressionPlot.loessRegression(data, filtering);
                const lineGenerator = d3.line()
                    .curve(d3.curveBasis)
                    .x(d => thisPlot.xScale(d[0]))
                    .y(d => thisPlot.yScale(d[1]));
                return lineGenerator(loessRegression);
            })
                .on("mouseover", function (regressionData, i) {
                thisPlot.mouseoverLoess(this, regressionData, i, filtering);
            })
                .on("mouseout", function () {
                thisPlot.mouseout(d3.select(this));
            });
        }
        xScale(value) {
            const scaled = this.scatterPlot.xScale(value);
            return typeof scaled === "undefined" ? NaN : scaled;
        }
        yScale(value) {
            const scaled = this.scatterPlot.yScale(value);
            return typeof scaled === "undefined" ? NaN : scaled;
        }
        mouseoverLoess(path, data, i, filtering) {
            if (this.scatterPlot.mouseMode !== spm.SpConst.tooltipMouse.key) {
                return;
            }
            const pathSelection = d3.select(path);
            pathSelection.style("visibility", "visible");
            const tooltipLocation = this.tooltipLocation(path);
            d3.select(this.scatterPlot.bindto + " .mspTooltip").remove();
            const mspDiv = d3.select(this.scatterPlot.bindto + " .mspDiv");
            const tooltip = mspDiv.append("div")
                .attr("class", "mspTooltip")
                .style("display", "block")
                .style("left", tooltipLocation[0] + "px")
                .style("top", tooltipLocation[1] + "px");
            tooltip.append("div")
                .attr("class", "title")
                .html("Local Polynomial Regression");
            if (filtering & RegressionPlot.SUB_FILTER && this.scatterPlot.zColumn !== null) {
                const category = this.scatterPlot.zColumn.categories
                    ? this.scatterPlot.zColumn.categories[i]
                    : "undefined";
                tooltip.append("div")
                    .html(`where z axis ${this.scatterPlot.zColumn.labelText()} = ${category}`);
            }
            if (filtering & RegressionPlot.CUT_FILTER) {
                const filteredUncutData = data.filterData(this.scatterPlot.spData.sampleData);
                const filteredCutData = data.filterData(this.scatterPlot.spData.cutData());
                tooltip.append("div")
                    .html(`used points: ${filteredCutData.length} (cut points: ${filteredUncutData.length - filteredCutData.length})`);
            }
        }
        static linearRegression(data, filtering) {
            let linearRegression = filtering & RegressionPlot.CUT_FILTER ? data.cutLinearRegression : data.uncutLinearRegression;
            if (!linearRegression) {
                console.error("RegressionPlot.update called but no linear regression computed");
                linearRegression = [[0, 0]];
                linearRegression.rSquared = 0;
            }
            return linearRegression;
        }
        static loessRegression(data, filtering) {
            let loessRegression = filtering & RegressionPlot.CUT_FILTER ? data.cutLoessRegression : data.uncutLoessRegression;
            if (!loessRegression) {
                console.error("RegressionPlot.update called but no loess regression computed");
                loessRegression = [[0, 0]];
            }
            return loessRegression;
        }
        computePlot(zColumn) {
            this.mainRegr.computePlot();
            if (!zColumn || !zColumn.categories) {
                this.subRegrList = [];
            }
            else {
                this.subRegrList = zColumn.categories.map((_cat, i) => {
                    return new spm.RegressionData(this, RegressionPlot.catFilter(zColumn, i));
                });
            }
            this.subRegrList.forEach(data => {
                data.computePlot();
            });
            return this;
        }
        static catFilter(column, catIndex) {
            return function (row) {
                return row[column.dim] === catIndex;
            };
        }
        drawCanvas() {
            if (this.useLinearRep()) {
                this.drawPlotCanvas(RegressionPlot.LINEAR_REP, RegressionPlot.SUB_FILTER);
                this.drawPlotCanvas(RegressionPlot.LINEAR_REP, RegressionPlot.SUB_FILTER | RegressionPlot.CUT_FILTER);
                this.drawPlotCanvas(RegressionPlot.LINEAR_REP, RegressionPlot.CUT_FILTER);
                this.drawPlotCanvas(RegressionPlot.LINEAR_REP, RegressionPlot.NO_FILTER);
            }
            if (this.useLoessRep()) {
                this.drawPlotCanvas(RegressionPlot.LOESS_REP, RegressionPlot.SUB_FILTER);
                this.drawPlotCanvas(RegressionPlot.LOESS_REP, RegressionPlot.SUB_FILTER | RegressionPlot.CUT_FILTER);
                this.drawPlotCanvas(RegressionPlot.LOESS_REP, RegressionPlot.CUT_FILTER);
                this.drawPlotCanvas(RegressionPlot.LOESS_REP, RegressionPlot.NO_FILTER);
            }
        }
        // eslint-disable-next-line max-lines-per-function
        drawPlotCanvas(repType, filtering) {
            if (!this.plotVisibility(filtering)) {
                return;
            }
            const canvasSelector = this.scatterPlot.canvasSelector(false);
            const canvasNode = d3.select(canvasSelector).node();
            if (!canvasNode) {
                console.error("canvasNode is null");
                return;
            }
            const context2d = canvasNode.getContext("2d");
            if (!context2d) {
                console.error("context2d is null");
                return;
            }
            const thisPlot = this;
            const xScaleRange = this.scatterPlot.xScale.range();
            const yScaleRange = this.scatterPlot.yScale.range();
            const xPlot = -xScaleRange[0];
            const yPlot = -yScaleRange[1];
            context2d.globalAlpha = 0.5;
            const lineGenerator = d3.line()
                .curve(d3.curveBasis)
                .x(d => xPlot + thisPlot.xScale(d[0]))
                .y(d => yPlot + thisPlot.yScale(d[1]))
                .context(context2d);
            const dataList = filtering & RegressionPlot.SUB_FILTER ? this.subRegrList : [this.mainRegr];
            dataList.forEach(function (regressionData, i) {
                context2d.beginPath();
                const regression = repType === RegressionPlot.LINEAR_REP
                    ? RegressionPlot.linearRegression(regressionData, filtering)
                    : RegressionPlot.loessRegression(regressionData, filtering);
                lineGenerator(regression);
                context2d.lineWidth = 3;
                if (!(filtering & RegressionPlot.CUT_FILTER)) {
                    console.warn("!(filtering & RegressionPlot.CUT_FILTER)");
                }
                if (filtering & RegressionPlot.SUB_FILTER) {
                    context2d.strokeStyle = thisPlot.subColorScale(i);
                }
                else {
                    context2d.strokeStyle = thisPlot.scatterPlot.zColumn === null || thisPlot.scatterPlot.zColumn.categories === null
                        ? spm.SpConst.NO_CAT_COLOR
                        : spm.SpConst.LIGHTER_NO_CAT_COLOR;
                }
                context2d.stroke();
            });
        }
    }
    RegressionPlot.NO_FILTER = 0;
    RegressionPlot.CUT_FILTER = 1;
    RegressionPlot.SUB_FILTER = 1 << 1;
    RegressionPlot.LINEAR_REP = 1;
    RegressionPlot.LOESS_REP = 1 << 1;
    spm.RegressionPlot = RegressionPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class RowFilter {
        constructor(column) {
            // Set when a brush is modified
            // Read when multibrush is initialized
            this.contCutoffs = null;
            this.keptCatIndexes = null;
            this.column = column;
        }
        // To call when a category is clicked.
        toggleCategory(catIndex) {
            if (this.column.categories) {
                if (this.keptCatIndexes === null) {
                    this.keptCatIndexes = new Set(d3.range(this.column.categories.length));
                    this.keptCatIndexes.delete(catIndex);
                }
                else if (this.keptCatIndexes.has(catIndex)) {
                    this.keptCatIndexes.delete(catIndex);
                }
                else {
                    this.keptCatIndexes.add(catIndex);
                    if (this.keptCatIndexes.size === this.column.categories.length) {
                        this.keptCatIndexes = null;
                    }
                }
            }
            else {
                console.error("categories is null but 'toggleCategory' is called.");
            }
        }
        // To call when the overlay of categories is clicked.
        toggleCategories() {
            if (this.column.categories === null) {
                console.error("categories is null but 'toggleCategories' is called.");
            }
            else {
                if (this.keptCatIndexes === null) {
                    this.keptCatIndexes = new Set();
                }
                else {
                    this.keptCatIndexes = null;
                }
            }
        }
        // To call to respond to a request (API used by R htmlwidget)
        getCutoffs() {
            const categories = this.column.categories;
            if (categories) {
                if (this.keptCatIndexes === null) {
                    return null;
                }
                return [...this.keptCatIndexes].map(catIndex => categories[catIndex]);
            }
            return this.contCutoffs;
        }
        // To call to respond to a request (API used by R htmlwidget)
        setCutoffs(cutoffs) {
            if (cutoffs) {
                const categories = this.column.categories;
                if (categories) {
                    if (cutoffs.length !== 0 && typeof cutoffs[0] !== "string" && typeof cutoffs[0] !== "number") {
                        console.log("Wrong categorical cutoffs are provided:", cutoffs);
                    }
                    else {
                        const catCutoffs = cutoffs;
                        const indexes = catCutoffs
                            .map(catCo => {
                            const catIndex = categories.indexOf(catCo.toString());
                            if (catIndex === -1) {
                                console.log(catCo + " is not a category of " + this.column.dim);
                            }
                            return catIndex;
                        })
                            .filter(index => index !== -1);
                        this.keptCatIndexes = new Set(indexes);
                    }
                }
                else {
                    if (typeof cutoffs[0] === "string" || typeof cutoffs[0] === "number") {
                        console.log("categories is null but categorical cutoffs are provided:", cutoffs);
                    }
                    else {
                        this.contCutoffs = cutoffs.map(co => {
                            // reverse order
                            return co.sort(function (a, b) {
                                return b - a;
                            });
                        });
                    }
                }
            }
            else {
                this.contCutoffs = null;
                this.keptCatIndexes = null;
            }
        }
        // Not used
        hasFilters() {
            return this.contCutoffs !== null || this.keptCatIndexes !== null;
        }
        // Used to class 'category' dom elements (active/inactive)
        // Used to update 'cutRows' attribute
        isKeptRow(row) {
            return this.isKeptValue(row[this.column.dim]);
        }
        isKeptValue(value) {
            if (this.contCutoffs !== null) {
                let active = false;
                this.contCutoffs.forEach(function (contCutoff) {
                    active =
                        active ||
                            (contCutoff[0] <= value && value <= contCutoff[1]);
                });
                return active;
            }
            if (this.keptCatIndexes !== null) {
                return this.keptCatIndexes.has(value);
            }
            return true;
        }
    }
    spm.RowFilter = RowFilter;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class ScatterPlot {
        constructor(spData, config) {
            this.xPlot = 0;
            this.yPlot = 0;
            this.width = 0;
            this.height = 0;
            this.xScale = d3.scaleLinear();
            this.axisVisibility = { xTitle: true, xValues: true, yTitle: true, yValues: true };
            this.scatterXAxis = d3.axisBottom(this.xScale)
                .tickFormat(ScatterPlot.prototype.formatXValue.bind(this));
            this.yScale = d3.scaleLinear();
            this.scatterYAxis = d3.axisLeft(this.yScale)
                .tickFormat(ScatterPlot.prototype.formatYValue.bind(this));
            this.zScale = d3.scaleLinear();
            this.continuousCslAxis = d3.axisRight(this.zScale)
                .tickFormat(ScatterPlot.prototype.formatZValue.bind(this));
            this.brush = null;
            this.dblClickTimeout = null;
            this.regressionPlot = null;
            this.xDistribPlot = null;
            this.yDistribPlot = null;
            this.horViolinPlots = [];
            this.verViolinPlots = [];
            this.pickingReady = false;
            this.spData = spData;
            this.bindto = config.bindto;
            this.index = config.index;
            this.xColumn = spData.columns[spData.dimensions[0]];
            this.yColumn = spData.columns[spData.dimensions[0]];
            this.zColumn = null;
            this.row = config.row;
            this.col = config.col;
            this.regressionType = config.regressionType;
            this.mouseMode = config.mouseMode;
            this.continuousCsId = config.continuousCsId;
            this.categoricalCsId = config.categoricalCsId;
            this.distribVisibility = config.distribVisibility;
            this.distribType = config.distribType;
            this.axisVisibility = config.axisVisibility;
            this.xRowFilter = new spm.RowFilter(this.xColumn);
            this.yRowFilter = new spm.RowFilter(this.yColumn);
            this.contColorScale = d3.scaleSequential(spm.SpConst.CONTINUOUS_CS[this.continuousCsId]);
            this.catColorScale = spm.SpConst.CATEGORIAL_CS[this.categoricalCsId];
        }
        removePlot() {
            this.plotSelection().remove();
            d3.select(this.canvasSelector(true)).remove();
            d3.select(this.canvasSelector(false)).remove();
            this.spData.on(spm.SpData.HL_POINT_EVENT + "." + this.index, null);
        }
        setXColumn(column) {
            this.xColumn = column;
            this.xDistribPlot = null;
            this.horViolinPlots = [];
            this.verViolinPlots = [];
            this.xRowFilter = new spm.RowFilter(this.xColumn);
        }
        setYColumn(column) {
            this.yColumn = column;
            this.yDistribPlot = null;
            this.horViolinPlots = [];
            this.verViolinPlots = [];
            this.yRowFilter = new spm.RowFilter(this.yColumn);
        }
        setZColumn(column) {
            this.zColumn = column;
        }
        formatXValue(value) {
            return this.xColumn.formatedValue(value);
        }
        formatYValue(value) {
            return this.yColumn.formatedValue(value);
        }
        formatZValue(value) {
            return this.zColumn === null ? "No Z axis" : this.zColumn.formatedValue(value);
        }
        // eslint-disable-next-line max-lines-per-function
        draw(updateType) {
            const plotSelection = this.plotSelection();
            this.updateScales();
            if (updateType & ScatterPlot.INIT) {
                // Add Numbering to the plot
                const x = (this.width * this.distribRatio() + this.width - ScatterPlot.padding.r) / 2;
                const y = (this.height * (1 - this.distribRatio()) + ScatterPlot.padding.t) / 2;
                plotSelection.append("text")
                    .attr("class", "scatterNumber")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .text(this.index + 1);
            }
            this.drawXAxis(updateType, plotSelection);
            this.drawYAxis(updateType, plotSelection);
            this.drawJitterZones(updateType, plotSelection);
            if (updateType & ScatterPlot.INIT) {
                // Add a rect to listen mouse events for canvas 
                const xScaleRange = this.xScale.range();
                const yScaleRange = this.yScale.range();
                const spRect = plotSelection.select(".spArea")
                    .append("rect")
                    .attr("class", "spRect")
                    .attr("x", xScaleRange[0])
                    .attr("y", yScaleRange[1])
                    .attr("width", xScaleRange[1] - xScaleRange[0])
                    .attr("height", yScaleRange[0] - yScaleRange[1])
                    .attr("fill", "none")
                    .attr("pointer-events", "fill")
                    .on("mousemove", function (plot) {
                    plot.spData.dispatch.call(spm.SpData.HL_GRAPH_EVENT, undefined, plot);
                    plot.canvasMousemove(d3.mouse(this));
                })
                    .on("mouseout", function (plot) {
                    plot.canvasMouseout();
                    const coord = d3.mouse(this);
                    if (coord[0] < xScaleRange[0] || coord[0] > xScaleRange[1]
                        || coord[1] < yScaleRange[1] || coord[0] > yScaleRange[0]) {
                        plot.spData.dispatch.call(spm.SpData.HL_GRAPH_EVENT, undefined, null);
                    }
                });
                // Compute 'xPlot' and 'yPlot' (useful for canvas)
                const mspDivNode = d3.select(this.bindto + " .mspDiv").node();
                const parentBounds = (mspDivNode === null) ? null : mspDivNode.getBoundingClientRect();
                const xParent = (parentBounds === null) ? 0 : parentBounds.x;
                const yParent = (parentBounds === null) ? 0 : parentBounds.y;
                const spRectNode = spRect.node();
                const spRectBounds = (spRectNode === null) ? null : spRectNode.getBoundingClientRect();
                const xSpRect = (spRectBounds === null) ? 0 : spRectBounds.x;
                const ySpRect = (spRectBounds === null) ? 0 : spRectBounds.y;
                this.xPlot = xSpRect - xParent;
                this.yPlot = ySpRect - yParent;
                // React to 'HL_POINT_EVENT' to highlight the point which is hovered by mouse
                const thisPlot = this;
                this.spData.on(spm.SpData.HL_POINT_EVENT + "." + this.index, function () {
                    if (thisPlot.plotSelection().size() !== 0) {
                        thisPlot.drawCanvas(false);
                    }
                });
            }
            this.drawRegressionPlots(updateType, plotSelection);
            this.drawDistribPlots(updateType, plotSelection);
            this.drawVerViolinPlots(updateType, plotSelection);
            this.drawHorViolinPlots(updateType, plotSelection);
            this.drawCsl(updateType, plotSelection);
            this.drawBrush(updateType, plotSelection);
            this.drawCanvas(false, plotSelection);
        }
        hlGraph(highlight) {
            const plotSelection = this.plotSelection();
            plotSelection.select(".spRect")
                .classed("hlGraph", highlight);
        }
        plotSelection(plotSelection) {
            if (plotSelection) {
                return plotSelection;
            }
            const thisPlot = this;
            const mspGroup = d3.select(this.bindto + " .mspGroup");
            return mspGroup.selectAll(".scatterPlot")
                .filter(function (plot) {
                return plot.row === thisPlot.row && plot.col === thisPlot.col;
            });
        }
        drawRegressionPlots(updateType, plotSelection) {
            const spArea = plotSelection.select(".spArea");
            if (updateType & ScatterPlot.INIT || !this.regressionPlot) {
                this.regressionPlot = new spm.RegressionPlot(this);
                this.regressionPlot.generate(spArea);
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.SHAPE | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.Z_AXIS)) {
                this.regressionPlot.computePlot(this.zColumn);
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.PALETTE)) {
                this.regressionPlot.colorScale(this.catColorScale);
            }
            this.regressionPlot.update(updateType, spArea);
        }
        // eslint-disable-next-line max-lines-per-function
        drawDistribPlots(updateType, plotSelection) {
            if (!this.distribVisibility) {
                return;
            }
            const distribGroup = plotSelection.select(".distribGroup");
            // Horizontal Distrib Plot
            if (updateType & ScatterPlot.INIT || !this.xDistribPlot) {
                this.xDistribPlot = new spm.DistributionPlot(this.spData, this.xColumn, {
                    bindto: this.bindto,
                    orientation: spm.DistributionPlot.HOR,
                    mouseMode: this.mouseMode,
                    categoricalCsId: this.categoricalCsId,
                    distribType: this.distribType
                });
                this.xDistribPlot.generate(distribGroup, "#x-clip");
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.SHAPE | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.Z_AXIS)) {
                const xDistribPlotRange = [this.height, this.height * (1 - this.distribRatio() * 0.8)];
                this.xDistribPlot
                    .valuesScaleRange(this.xScale.range())
                    .computePlot(this.zColumn)
                    .distribScaleRange(xDistribPlotRange);
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.PALETTE)) {
                this.xDistribPlot.colorScale(this.catColorScale);
            }
            this.xDistribPlot.update(updateType, distribGroup);
            // Vertical Distrib Plot
            if (updateType & ScatterPlot.INIT || !this.yDistribPlot) {
                this.yDistribPlot = new spm.DistributionPlot(this.spData, this.yColumn, {
                    bindto: this.bindto,
                    orientation: spm.DistributionPlot.VER,
                    mouseMode: this.mouseMode,
                    categoricalCsId: this.categoricalCsId,
                    distribType: this.distribType
                });
                this.yDistribPlot.generate(distribGroup, "#y-clip");
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.SHAPE | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.Z_AXIS)) {
                const yDistribPlotRange = [0, this.width * this.distribRatio() * 0.8];
                this.yDistribPlot
                    .valuesScaleRange(this.yScale.range())
                    .computePlot(this.zColumn)
                    .distribScaleRange(yDistribPlotRange);
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.PALETTE)) {
                this.yDistribPlot.colorScale(this.catColorScale);
            }
            this.yDistribPlot.update(updateType, distribGroup);
        }
        distribRatio() {
            return this.distribVisibility
                ? ScatterPlot.DISTRIB_RATIO
                : 0;
        }
        drawVerViolinPlots(updateType, plotSelection) {
            const thisPlot = this;
            const spArea = plotSelection.select(".spArea");
            const xCategories = this.xColumn.categories ? this.xColumn.categories : [];
            if (updateType & ScatterPlot.INIT || this.verViolinPlots.length === 0) {
                this.verViolinPlots = xCategories.map(_cat => new spm.DistributionPlot(this.spData, this.yColumn, {
                    bindto: this.bindto,
                    orientation: spm.DistributionPlot.VER,
                    mouseMode: this.mouseMode,
                    categoricalCsId: this.categoricalCsId,
                    distribType: this.distribType
                }));
            }
            spArea.selectAll(".ver.violinGroup").data(this.verViolinPlots)
                .join(enter => enter.append("g")
                .attr("class", "ver violinGroup")
                .each(function (violinPlot) {
                violinPlot.generate(d3.select(this));
            }), update => update, exit => exit.remove())
                .each(function (violinPlot, i) {
                if (updateType & (ScatterPlot.INIT | ScatterPlot.SHAPE | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.Z_AXIS)) {
                    const violinRange = ScatterPlot.verViolinRange(thisPlot.xScale, i, xCategories.length);
                    violinPlot
                        .valuesScaleRange(thisPlot.yScale.range())
                        .computePlot(thisPlot.zColumn, { column: thisPlot.xColumn, catIndex: i })
                        .distribScaleRange(violinRange);
                }
                if (updateType & (ScatterPlot.INIT | ScatterPlot.PALETTE | ScatterPlot.Z_AXIS)) {
                    violinPlot.colorScale(thisPlot.catColorScale);
                }
                violinPlot.update(updateType, d3.select(this));
            });
        }
        drawHorViolinPlots(updateType, plotSelection) {
            const thisPlot = this;
            const spArea = plotSelection.select(".spArea");
            const yCategories = this.yColumn.categories ? this.yColumn.categories : [];
            if (updateType & ScatterPlot.INIT || this.horViolinPlots.length === 0) {
                this.horViolinPlots = yCategories.map(_cat => new spm.DistributionPlot(this.spData, this.xColumn, {
                    bindto: this.bindto,
                    orientation: spm.DistributionPlot.HOR,
                    mouseMode: this.mouseMode,
                    categoricalCsId: this.categoricalCsId,
                    distribType: this.distribType
                }));
            }
            spArea.selectAll(".hor.violinGroup").data(this.horViolinPlots)
                .join(enter => enter.append("g")
                .attr("class", "hor violinGroup")
                .each(function (violinPlot) {
                violinPlot.generate(d3.select(this));
            }), update => update, exit => exit.remove())
                .each(function (violinPlot, i) {
                if (updateType & (ScatterPlot.INIT | ScatterPlot.SHAPE | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.Z_AXIS)) {
                    const violinRange = ScatterPlot.horViolinRange(thisPlot.yScale, i, yCategories.length);
                    violinPlot
                        .valuesScaleRange(thisPlot.xScale.range())
                        .computePlot(thisPlot.zColumn, { column: thisPlot.yColumn, catIndex: i })
                        .distribScaleRange(violinRange);
                }
                if (updateType & (ScatterPlot.INIT | ScatterPlot.PALETTE | ScatterPlot.Z_AXIS)) {
                    violinPlot.colorScale(thisPlot.catColorScale);
                }
                violinPlot.update(updateType, d3.select(this));
            });
        }
        updateScales() {
            this.updateXScale();
            this.updateYScale();
            this.updateZScale();
        }
        updateXScale() {
            this.xScale
                .range([this.width * this.distribRatio(), this.width - ScatterPlot.padding.r])
                .domain(this.xColumn.domain());
            if (this.xColumn.categories === null) {
                this.xScale.nice();
            }
            const xTickSize = -this.height + ScatterPlot.padding.t;
            this.scatterXAxis.scale(this.xScale)
                .ticks(this.xColumn.axisTicks())
                .tickSize(xTickSize);
        }
        updateYScale() {
            this.yScale
                .range([this.height * (1 - this.distribRatio()), ScatterPlot.padding.t])
                .domain(this.yColumn.domain());
            if (this.yColumn.categories === null) {
                this.yScale.nice();
            }
            const yTickSize = -this.width + ScatterPlot.padding.r;
            this.scatterYAxis.scale(this.yScale)
                .ticks(this.yColumn.axisTicks())
                .tickSize(yTickSize);
        }
        updateZScale() {
            const zColumn = this.zColumn;
            if (zColumn === null) {
                return;
            }
            this.zScale
                .range([this.height * (1 - this.distribRatio()) - ScatterPlot.padding.t, 0])
                .domain(zColumn.domain());
            if (zColumn.categories === null) {
                this.zScale.nice();
                const [zMin, zMax] = zColumn.domain();
                this.contColorScale = d3.scaleSequential(spm.SpConst.CONTINUOUS_CS[this.continuousCsId])
                    .domain([zMin, zMax]);
                this.continuousCslAxis.scale(this.zScale)
                    .ticks(zColumn.axisTicks());
            }
            else {
                const zMax = zColumn.domain()[1];
                this.catColorScale = spm.SpConst.CATEGORIAL_CS[this.categoricalCsId]
                    .domain(d3.range(zMax));
            }
        }
        drawCsl(updateType, plotSelection) {
            if (updateType & ScatterPlot.INIT) {
                plotSelection.append("g")
                    .attr("class", "cslGroup");
            }
            else {
                plotSelection.select(".cslGroup > g").remove();
            }
            plotSelection.select(".cslGroup").style("visibility", this.zColumn === null ? "hidden" : "visible");
            const zColumn = this.zColumn;
            if (zColumn === null) {
                return;
            }
            if (updateType & (ScatterPlot.INIT | ScatterPlot.PALETTE | ScatterPlot.Z_AXIS | ScatterPlot.RANGE | ScatterPlot.DOMAIN)) {
                if (zColumn.categories === null) {
                    this.drawContinuousCsl(plotSelection);
                }
                else {
                    this.drawCategoricalCsl(plotSelection);
                }
                // Set Color Scale Legend position
                plotSelection.select(".cslGroup").attr("transform", "translate(" + (this.width + ScatterPlot.cslLeft) + ", " + ScatterPlot.padding.t + ")");
                // Set title of Color Scale Legend
                ScatterPlot.tspanColumnTitleBT(plotSelection.select(".cslTitle"), zColumn);
            }
        }
        static tspanColumnTitleBT(textSelection, column) {
            const labels = column.label.split("<br>");
            textSelection.text(labels[labels.length - 1]);
            for (let i = 1; i < labels.length; i++) {
                textSelection.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "-1em")
                    .text(labels[labels.length - 1 - i]);
            }
        }
        static tspanColumnTitleTB(textSelection, column) {
            const labels = column.label.split("<br>");
            textSelection.text(labels[0]);
            for (let i = 1; i < labels.length; i++) {
                textSelection.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1em")
                    .text(labels[i]);
            }
        }
        drawContinuousCsl(plotSelection) {
            const thisPlot = this;
            const cslGroup = plotSelection.select(".cslGroup");
            const continuousCslGroup = cslGroup.append("g").attr("class", "continuous");
            const colorScaleBars = continuousCslGroup.append("g").attr("class", "colorScaleBars");
            const csHeight = thisPlot.zScale.range()[0] - thisPlot.zScale.range()[1];
            colorScaleBars.selectAll(".colorScaleBar")
                .data(d3.range(csHeight))
                .enter().append("rect")
                .attr("class", "colorScaleBar")
                .attr("y", function (_d, i) {
                return i;
            })
                .attr("width", ScatterPlot.cslWidth)
                .attr("height", 1)
                .style("fill", function (pixel) {
                const fill = thisPlot.contColorScale(thisPlot.zScale.invert(pixel));
                return typeof fill === "undefined" ? "black" : fill;
            });
            continuousCslGroup.append("rect")
                .attr("class", "continuousCslRect")
                .attr("width", ScatterPlot.cslWidth)
                .attr("height", csHeight);
            continuousCslGroup.append("g")
                .attr("class", "continuousCslAxis")
                .attr("transform", "translate(" + ScatterPlot.cslWidth + ", 0)")
                .call(this.continuousCslAxis);
            continuousCslGroup.append("text")
                .attr("class", "cslTitle")
                .attr("x", 0)
                .attr("y", -7);
        }
        drawCategoricalCsl(plotSelection) {
            const zColumn = this.zColumn;
            if (zColumn === null || !zColumn.categories) {
                console.log("'drawCategoricalCsl' called, but Z column is not categorial");
                return;
            }
            const thisPlot = this;
            const cslGroup = plotSelection.select(".cslGroup");
            const catGroupHeight = 15;
            const yCatGroup = 0.5 * (this.height - zColumn.categories.length * catGroupHeight);
            const categorialCslGroup = cslGroup.append("g")
                .attr("transform", `translate(0,${yCatGroup < 0 ? 0 : yCatGroup})`);
            categorialCslGroup.append("text")
                .attr("class", "cslTitle")
                .attr("x", 0)
                .attr("y", -7);
            const categoryGroup = categorialCslGroup.selectAll(".categoryGroup")
                .data(zColumn.categories)
                .enter().append("g")
                .attr("class", "categoryGroup")
                .attr("transform", (_cat, i) => `translate(0,${i * catGroupHeight})`);
            categoryGroup.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", function (_cat, i) { return thisPlot.catColorScale(i); });
            categoryGroup.append("text")
                .attr("x", 15)
                .attr("y", 5)
                .attr("dy", "0.35em")
                .text(function (cat) { return cat; });
        }
        drawXAxis(updateType, plotSelection) {
            if (updateType & (ScatterPlot.INIT | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.SHAPE)) {
                const axesGroup = plotSelection.select(".axesGroup");
                if (updateType & ScatterPlot.INIT) {
                    axesGroup.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + this.height + ")");
                    if (this.axisVisibility.xTitle) {
                        const x = (this.width * this.distribRatio() + this.width - ScatterPlot.padding.r) / 2;
                        const y = this.height + ScatterPlot.margin.b - 5;
                        axesGroup.append("text")
                            .attr("class", "x scatterlabel")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("text-anchor", "middle")
                            .attr("dominant-baseline", "middle");
                    }
                }
                axesGroup.select(".x.axis").call(this.scatterXAxis)
                    .selectAll(".tick text")
                    .attr("transform", "rotate(45)")
                    .style("text-anchor", "start")
                    .attr("display", this.axisVisibility.xValues ? "block" : "none");
                if (this.axisVisibility.xTitle) {
                    axesGroup.select(".x.scatterlabel").text(this.xColumn.labelText());
                }
            }
        }
        drawYAxis(updateType, plotSelection) {
            if (updateType & (ScatterPlot.INIT | ScatterPlot.RANGE | ScatterPlot.DOMAIN | ScatterPlot.SHAPE)) {
                const axesGroup = plotSelection.select(".axesGroup");
                if (updateType & ScatterPlot.INIT) {
                    axesGroup.append("g")
                        .attr("class", "y axis");
                    if (this.axisVisibility.yTitle) {
                        const x = -ScatterPlot.margin.l * 0.7;
                        const y = (this.height * (1 - this.distribRatio()) + ScatterPlot.padding.t) / 2;
                        axesGroup.append("text")
                            .attr("class", "y scatterlabel")
                            .attr("transform", "translate(" + x + "," + y + ")rotate(270)")
                            .attr("dominant-baseline", "baseline")
                            .attr("text-anchor", "middle");
                    }
                }
                axesGroup.select(".y.axis").call(this.scatterYAxis)
                    .selectAll(".tick text")
                    .attr("display", this.axisVisibility.yValues ? "block" : "none");
                if (this.axisVisibility.yTitle) {
                    axesGroup.select(".y.scatterlabel").text(this.yColumn.labelText());
                }
            }
        }
        // eslint-disable-next-line max-lines-per-function
        drawJitterZones(_updateType, plotSelection) {
            const thisPlot = this;
            const spArea = plotSelection.select(".spArea");
            const xZoneRange = this.xColumn.categories
                ? this.xColumn.categories
                    .map((_cat, i) => [thisPlot.xScale(i - 0.5 / spm.SpConst.CAT_RATIO), thisPlot.xScale(i + 0.5 / spm.SpConst.CAT_RATIO)]
                    .map(ScatterPlot.undef2Nan))
                : [thisPlot.xScale.range()];
            const yZoneRange = this.yColumn.categories
                ? this.yColumn.categories
                    .map((_cat, i) => [thisPlot.yScale(i - 0.5 / spm.SpConst.CAT_RATIO), thisPlot.yScale(i + 0.5 / spm.SpConst.CAT_RATIO)]
                    .map(ScatterPlot.undef2Nan))
                : [thisPlot.yScale.range()];
            const jitterZonesIndexes = [];
            for (let i = 0; i < xZoneRange.length; i++) {
                for (let j = 0; j < yZoneRange.length; j++) {
                    jitterZonesIndexes.push([i, j]);
                }
            }
            spArea.selectAll(".jitterZone").data(d3.range(jitterZonesIndexes.length))
                .join(enter => enter.append("rect")
                .attr("class", "jitterZone"), update => update, exit => exit.remove())
                .attr("x", function (zoneIndex) {
                const index = jitterZonesIndexes[zoneIndex][0];
                return Math.min(xZoneRange[index][0], xZoneRange[index][1]);
            })
                .attr("y", function (zoneIndex) {
                const index = jitterZonesIndexes[zoneIndex][1];
                return Math.min(yZoneRange[index][0], yZoneRange[index][1]);
            })
                .attr("width", function (zoneIndex) {
                const index = jitterZonesIndexes[zoneIndex][0];
                return Math.abs(xZoneRange[index][1] - xZoneRange[index][0]);
            })
                .attr("height", function (zoneIndex) {
                const index = jitterZonesIndexes[zoneIndex][1];
                return Math.abs(yZoneRange[index][1] - yZoneRange[index][0]);
            });
        }
        fixBrush() {
            const plotSelection = this.plotSelection();
            if (this.mouseMode === spm.SpConst.tooltipMouse.key) {
                plotSelection.selectAll(".selection").style("display", "none");
                plotSelection.selectAll(".handle").style("display", "none");
                plotSelection.selectAll(".overlay").style("pointer-events", "auto");
            }
            else {
                plotSelection.selectAll(".selection").style("display", null);
                plotSelection.selectAll(".handle").style("display", null);
                plotSelection.selectAll(".overlay").style("pointer-events", "all");
            }
            if (this.mouseMode === spm.SpConst.filterMouse.key) {
                this.drawBrush(ScatterPlot.RANGE, plotSelection);
            }
        }
        drawBrush(updateType, plotSelection) {
            const thisPlot = this;
            const spArea = plotSelection.select(".spArea");
            if (updateType & ScatterPlot.INIT || !this.brush) {
                this.brush = d3.brush()
                    // .on("start", () => {
                    // })
                    .on("brush", () => {
                    const brushZone = d3.event.selection;
                    thisPlot.brushmove(brushZone);
                })
                    .on("end", () => {
                    const brushZone = d3.event.selection;
                    thisPlot.brushend(brushZone);
                });
                const xExtent = [
                    thisPlot.xScale.range()[0],
                    thisPlot.yScale.range()[1]
                ];
                const yExtent = [
                    thisPlot.xScale.range()[1],
                    thisPlot.yScale.range()[0]
                ];
                this.brush.extent([xExtent, yExtent]);
                spArea.call(this.brush);
            }
            if (thisPlot.mouseMode === spm.SpConst.filterMouse.key
                && this.xRowFilter.contCutoffs
                && this.yRowFilter.contCutoffs) {
                const xExtent = d3.extent(this.xRowFilter.contCutoffs[0].map(thisPlot.xScale).map(ScatterPlot.undef2Nan));
                const yExtent = d3.extent(this.yRowFilter.contCutoffs[0].map(thisPlot.yScale).map(ScatterPlot.undef2Nan));
                spArea.call(this.brush.move, [[xExtent[0], yExtent[0]], [xExtent[1], yExtent[1]]]);
            }
        }
        // Highlight the selected points.
        brushmove(brushZone) {
            if (this.mouseMode !== spm.SpConst.filterMouse.key) {
                return;
            }
            if (brushZone === null) {
                this.xRowFilter.contCutoffs = null;
                this.yRowFilter.contCutoffs = null;
            }
            else {
                this.xRowFilter.contCutoffs = [[brushZone[0][0], brushZone[1][0]]]
                    .map(interval => interval.map(this.xScale.invert))
                    .map(interval => {
                    return interval.sort(function (a, b) {
                        return a - b;
                    });
                });
                this.yRowFilter.contCutoffs = [[brushZone[1][1], brushZone[0][1]]]
                    .map(interval => interval.map(this.yScale.invert))
                    .map(interval => {
                    return interval.sort(function (a, b) {
                        return a - b;
                    });
                });
            }
            this.spData.rowFilterChange();
        }
        // eslint-disable-next-line max-lines-per-function
        brushend(brushZone) {
            if (!this.brush) {
                return;
            }
            const thisPlot = this;
            if (this.mouseMode === spm.SpConst.filterMouse.key) {
                // If the brush is empty, select all points.
                if (brushZone === null) {
                    this.brushmove(null);
                }
            }
            else if (this.mouseMode === spm.SpConst.zoomMouse.key) {
                // zoom on selected zone, or unzoom when a double-click is detected
                if (!brushZone && !this.dblClickTimeout) {
                    this.dblClickTimeout = setTimeout(function () {
                        thisPlot.dblClickTimeout = null;
                    }, spm.SpConst.dblClickDelay);
                    return;
                }
                const plotSelection = this.plotSelection();
                if (brushZone) {
                    this.xScale.domain([brushZone[0][0], brushZone[1][0]].map(this.xScale.invert));
                    this.yScale.domain([brushZone[1][1], brushZone[0][1]].map(this.yScale.invert));
                    plotSelection.select(".spArea").call(this.brush.move, null);
                }
                else {
                    this.xScale.domain(this.xColumn.domain());
                    this.yScale.domain(this.yColumn.domain());
                }
                if (this.xColumn.categories === null) {
                    this.xScale.nice();
                }
                if (this.yColumn.categories === null) {
                    this.yScale.nice();
                }
                // Zoom for axes
                this.drawXAxis(ScatterPlot.DOMAIN, plotSelection);
                this.drawYAxis(ScatterPlot.DOMAIN, plotSelection);
                // Zoom for jitter zone
                this.drawJitterZones(ScatterPlot.DOMAIN, plotSelection);
                // Zoom for brush
                this.drawBrush(ScatterPlot.DOMAIN, plotSelection);
                // Zoom for regression plot
                if (this.regressionPlot) {
                    this.regressionPlot.update(ScatterPlot.DOMAIN, plotSelection);
                }
                this.drawCanvas(false, plotSelection);
                // Zoom for distribution plots
                if (this.xDistribPlot && this.distribVisibility) {
                    this.xDistribPlot.valuesScale.domain(this.xScale.domain());
                    this.xDistribPlot.update(ScatterPlot.DOMAIN, plotSelection.select(".distribGroup"));
                }
                if (this.yDistribPlot && this.distribVisibility) {
                    this.yDistribPlot.valuesScale.domain(this.yScale.domain());
                    this.yDistribPlot.update(ScatterPlot.DOMAIN, plotSelection.select(".distribGroup"));
                }
                // Vertical violin plots
                if (this.xColumn.categories) {
                    const xCategories = this.xColumn.categories;
                    const fullXScale = d3.scaleLinear()
                        .range(this.xScale.range())
                        .domain(this.xColumn.domain());
                    plotSelection.selectAll(".ver.violinGroup").each(function (violinPlot, i) {
                        const violinRange = ScatterPlot.verViolinRange(fullXScale, i, xCategories.length);
                        if (brushZone) {
                            const range = violinRange.map(fullXScale.invert).map(thisPlot.xScale).map(ScatterPlot.undef2Nan);
                            violinPlot.distribScaleRange(range);
                        }
                        else {
                            violinPlot.distribScaleRange(violinRange);
                        }
                        violinPlot.valuesScale.domain(thisPlot.yScale.domain());
                        violinPlot.update(ScatterPlot.DOMAIN, d3.select(this));
                    });
                }
                // Horizontal violin plots
                if (this.yColumn.categories) {
                    const yCategories = this.yColumn.categories;
                    const fullYScale = d3.scaleLinear()
                        .range(this.yScale.range())
                        .domain(this.yColumn.domain());
                    plotSelection.selectAll(".hor.violinGroup").each(function (violinPlot, i) {
                        const violinRange = ScatterPlot.horViolinRange(fullYScale, i, yCategories.length);
                        if (brushZone) {
                            const range = violinRange.map(fullYScale.invert).map(thisPlot.yScale).map(ScatterPlot.undef2Nan);
                            violinPlot.distribScaleRange(range);
                        }
                        else {
                            violinPlot.distribScaleRange(violinRange);
                        }
                        violinPlot.valuesScale.domain(thisPlot.xScale.domain());
                        violinPlot.update(ScatterPlot.DOMAIN, d3.select(this));
                    });
                }
            }
        }
        distribRepChange(newType) {
            this.distribType = newType;
            if (this.xDistribPlot) {
                this.xDistribPlot.distribType = newType;
            }
            if (this.yDistribPlot) {
                this.yDistribPlot.distribType = newType;
            }
            this.verViolinPlots.forEach(function (violinPlot) { violinPlot.distribType = newType; });
            this.horViolinPlots.forEach(function (violinPlot) { violinPlot.distribType = newType; });
            const plotSelection = this.plotSelection();
            this.drawDistribPlots(ScatterPlot.SHAPE, plotSelection);
            this.drawVerViolinPlots(ScatterPlot.SHAPE, plotSelection);
            this.drawHorViolinPlots(ScatterPlot.SHAPE, plotSelection);
        }
        regressionRepChange(newType) {
            this.regressionType = newType;
            const plotSelection = this.plotSelection();
            this.drawRegressionPlots(ScatterPlot.SHAPE, plotSelection);
            this.drawCanvas(false, plotSelection);
        }
        static undef2Nan(value) {
            return typeof value === "undefined" ? NaN : value;
        }
        static verViolinRange(scale, catIndex, catCount) {
            const min = ScatterPlot.undef2Nan(scale(catIndex + 0.5 / spm.SpConst.CAT_RATIO));
            const rangeLength = Math.abs(scale.range()[1] - scale.range()[0]);
            return [min, min + rangeLength / catCount / 3];
        }
        static horViolinRange(scale, catIndex, catCount) {
            const max = ScatterPlot.undef2Nan(scale(catIndex + 0.5 / spm.SpConst.CAT_RATIO));
            const rangeLength = Math.abs(scale.range()[1] - scale.range()[0]);
            return [max, max - rangeLength / catCount / 3];
        }
        changeMouseMode(mouseMode) {
            this.mouseMode = mouseMode;
            if (this.xDistribPlot) {
                this.xDistribPlot.mouseMode = mouseMode;
            }
            if (this.yDistribPlot) {
                this.yDistribPlot.mouseMode = mouseMode;
            }
            this.verViolinPlots.forEach(function (violinPlot) { violinPlot.mouseMode = mouseMode; });
            this.horViolinPlots.forEach(function (violinPlot) { violinPlot.mouseMode = mouseMode; });
        }
        canvasSelector(picking) {
            return this.bindto + " .canvas" + this.index + (picking ? ".picking" : ".drawing");
        }
        // eslint-disable-next-line max-lines-per-function
        drawCanvas(picking, plotSelection) {
            this.pickingReady = picking;
            const canvasSelector = this.canvasSelector(picking);
            let canvasSelection = d3.select(canvasSelector);
            if (canvasSelection.empty()) {
                canvasSelection = d3.select(this.bindto + " .MultiPlot").append("canvas")
                    .attr("class", "canvas" + this.index + (picking ? " picking" : " drawing"));
                if (picking) {
                    canvasSelection.style("display", "none");
                }
            }
            const xScaleRange = this.xScale.range();
            const yScaleRange = this.yScale.range();
            canvasSelection
                .attr("width", xScaleRange[1] - xScaleRange[0])
                .attr("height", yScaleRange[0] - yScaleRange[1])
                .style("left", this.xPlot + "px")
                .style("top", this.yPlot + "px");
            const canvasNode = canvasSelection.node();
            if (!canvasNode) {
                console.error("canvasNode is null");
                return;
            }
            const context2d = canvasNode.getContext("2d");
            if (!context2d) {
                console.error("context2d is null");
                return;
            }
            context2d.clearRect(0, 0, this.width, this.height);
            new spm.PointsPlot(this).drawCanvas(picking, plotSelection);
            if (this.regressionPlot && !picking) {
                this.regressionPlot.drawCanvas();
            }
        }
        canvasMousemove(coords) {
            if (!this.pickingReady) {
                this.drawCanvas(true);
            }
            const canvasSelector = this.canvasSelector(true);
            const canvasNode = d3.select(canvasSelector).node();
            if (!canvasNode) {
                console.error("canvasNode is null");
                return;
            }
            const context2d = canvasNode.getContext("2d");
            if (!context2d) {
                console.error("context2d is null");
                return;
            }
            const xScaleRange = this.xScale.range();
            const yScaleRange = this.yScale.range();
            const xPlot = -xScaleRange[0];
            const yPlot = -yScaleRange[1];
            const color = context2d.getImageData(xPlot + coords[0], yPlot + coords[1], 1, 1).data;
            const code = (color[2] + (color[1] << 8) + (color[0] << 16));
            if (color[3] === 0) {
                this.canvasMouseout();
            }
            else if (code < this.spData.sampleData.length) {
                this.spData.setHlPoint(code);
                new spm.PointsPlot(this).mouseover(this.spData.sampleData[code], code);
            }
        }
        canvasMouseout() {
            this.spData.setHlPoint(null);
            new spm.PointsPlot(this).mouseout();
        }
    }
    ScatterPlot.padding = { r: 10, t: 10 };
    // static readonly padding = { l: 30, r: 10, b: 30, t: 10 };
    ScatterPlot.DISTRIB_RATIO = 0.15;
    ScatterPlot.margin = { l: 60, r: 10, b: 50, t: 5 };
    ScatterPlot.cslRight = 30;
    ScatterPlot.cslLeft = 10;
    ScatterPlot.cslWidth = 20;
    ScatterPlot.cslTotalWidth = ScatterPlot.cslRight + ScatterPlot.cslLeft + ScatterPlot.cslWidth;
    ScatterPlot.pointRadius = 2;
    ScatterPlot.INIT = 1;
    ScatterPlot.SHAPE = 1 << 1;
    ScatterPlot.PALETTE = 1 << 2;
    ScatterPlot.Z_AXIS = 1 << 3;
    ScatterPlot.RANGE = 1 << 4;
    ScatterPlot.DOMAIN = 1 << 5;
    spm.ScatterPlot = ScatterPlot;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class ScatterPlotMatrix {
        constructor(id, width, height) {
            this.zColumn = null;
            this.width = 900;
            this.height = 750;
            this.mouseMode = spm.SpConst.tooltipMouse.key;
            this.rotateTitle = false;
            this.distribType = 
            // DistributionPlot.DENS_REP;
            // DistributionPlot.DENS_REP |
            spm.DistributionPlot.HISTO_REP;
            this.regressionType = 0;
            // RegressionPlot.LOESS_REP;
            // RegressionPlot.LOESS_REP |
            // RegressionPlot.LINEAR_REP;
            this.corrPlotType = 
            // CorrPlot.TEXT;
            spm.CorrPlot.CIRCLES_REP;
            this.continuousCsId = spm.SpConst.CONTINUOUS_CS_IDS[0];
            this.categoricalCsId = spm.SpConst.CATEGORIAL_CS_IDS[0];
            this.corrPlotCsId = spm.SpConst.CONTINUOUS_CS_IDS[3];
            this.dispatch = d3.dispatch(ScatterPlotMatrix.PLOT_EVENT);
            this.scatterPlotList = [];
            this.diagPlotList = [];
            this.corrPlotList = [];
            this.brushSlidersLinked = true;
            this.visibleDimsCount = 0;
            this.xVisibleDimIndex0 = 0;
            this.yVisibleDimIndex0 = 0;
            this.bindto = "#" + id;
            this.setSize(width, height);
        }
        resize(width, height) {
            this.setSize(width, height);
            d3.select(this.bindto + " .MultiPlot svg")
                .attr("width", this.width + ScatterPlotMatrix.margin.l + ScatterPlotMatrix.margin.r)
                .attr("height", this.height + ScatterPlotMatrix.margin.b + ScatterPlotMatrix.margin.t);
            this.removePlots();
            this.updatePlots(spm.ScatterPlot.INIT);
            this.xBrushSlider.update();
            this.yBrushSlider.update();
        }
        setSize(width, height) {
            const wSize = width - (ScatterPlotMatrix.margin.l + ScatterPlotMatrix.margin.r);
            const hSize = height - (ScatterPlotMatrix.margin.t + ScatterPlotMatrix.margin.b);
            this.width = Math.max(200, Math.min(wSize, hSize));
            this.height = this.width;
        }
        removePlots() {
            this.scatterPlotList.forEach(plot => {
                plot.removePlot();
            });
            d3.selectAll(this.bindto + " .diagPlot").remove();
            d3.selectAll(this.bindto + " .corrPlot").remove();
        }
        id() {
            return this.bindto.substring(1);
        }
        generate(config) {
            if (d3.select(this.bindto).empty()) {
                throw new Error("'bindto' dom element not found:" + this.bindto);
            }
            this.visibleDimsCount = 8;
            this.brushSlidersLinked = true;
            this.initData(config);
            this.initTilePlots();
            this.setZAxis(config.zAxisDim, true);
            this.buildMainDomElements(config);
            this.appendPlotSvg();
            this.appendDistribRepSelect();
            this.appendContCsSelect();
            this.appendCatCsSelect();
            this.appendCorrTypeSelect();
            this.appendCorrCsSelect();
            this.appendZAxisSelector();
            this.initZAxisUsedCB();
            this.appendMouseModeSelect();
            this.initRegressionCB();
            this.spData.on(spm.SpData.HL_GRAPH_EVENT, ScatterPlotMatrix.prototype.hlGraph.bind(this));
            this.updatePlots(spm.ScatterPlot.INIT);
            this.xBrushSlider.update();
            this.yBrushSlider.update();
            return this;
        }
        hlGraph(targetPlot) {
            this.scatterPlotList.forEach(plot => {
                plot.hlGraph(false);
            });
            this.diagPlotList.forEach(plot => {
                plot.hlGraph(false);
            });
            this.corrPlotList.forEach(plot => {
                plot.hlGraph(false);
            });
            if (targetPlot !== null) {
                const thisMPlot = this;
                const targetPlotXDimIndex = thisMPlot.xVisibleDimIndex0 + targetPlot.col;
                const targetPlotYDimIndex = thisMPlot.yVisibleDimIndex0 + targetPlot.row;
                [
                    [targetPlotXDimIndex, targetPlotXDimIndex],
                    [targetPlotXDimIndex, targetPlotYDimIndex],
                    [targetPlotYDimIndex, targetPlotYDimIndex],
                    [targetPlotYDimIndex, targetPlotXDimIndex]
                ].forEach(function (plotCoord) {
                    thisMPlot.scatterPlotList.forEach(plot => {
                        if (thisMPlot.xVisibleDimIndex0 + plot.col === plotCoord[0]
                            && thisMPlot.yVisibleDimIndex0 + plot.row === plotCoord[1]) {
                            plot.hlGraph(true);
                        }
                    });
                    thisMPlot.diagPlotList.forEach(plot => {
                        if (thisMPlot.xVisibleDimIndex0 + plot.col === plotCoord[0]
                            && thisMPlot.yVisibleDimIndex0 + plot.row === plotCoord[1]) {
                            plot.hlGraph(true);
                        }
                    });
                    thisMPlot.corrPlotList.forEach(plot => {
                        if (thisMPlot.xVisibleDimIndex0 + plot.col === plotCoord[0]
                            && thisMPlot.yVisibleDimIndex0 + plot.row === plotCoord[1]) {
                            plot.hlGraph(true);
                        }
                    });
                });
            }
        }
        on(type, callback) {
            // @ts-ignore
            this.dispatch.on(type, callback);
        }
        // eslint-disable-next-line max-lines-per-function
        initData(config) {
            if (!config.continuousCS) {
                this.continuousCsId = spm.SpConst.CONTINUOUS_CS_IDS[0];
            }
            else if (spm.SpConst.CONTINUOUS_CS_IDS.includes(config.continuousCS)) {
                this.continuousCsId = config.continuousCS;
            }
            else {
                console.log("Unknown continuous color scale: " + config.continuousCS);
            }
            if (!config.categoricalCS) {
                this.categoricalCsId = spm.SpConst.CATEGORIAL_CS_IDS[0];
            }
            else if (spm.SpConst.CATEGORIAL_CS_IDS.includes(config.categoricalCS)) {
                this.categoricalCsId = config.categoricalCS;
            }
            else {
                console.log("Unknown categorical color scale: " + config.categoricalCS);
            }
            if (!config.distribType) {
                this.distribType = 2;
            }
            else if ([0, 1, 2, 3].includes(config.distribType)) {
                this.distribType = config.distribType;
            }
            else {
                console.log("Unknown distribType: " + config.distribType);
            }
            if (!config.regressionType) {
                this.regressionType = 0;
            }
            else if ([0, 1, 2, 3].includes(config.regressionType)) {
                this.regressionType = config.regressionType;
            }
            else {
                console.log("Unknown regressionType: " + config.regressionType);
            }
            if (!config.corrPlotType) {
                this.corrPlotType = spm.CorrPlot.CIRCLES_REP;
            }
            else if ([spm.CorrPlot.CIRCLES_REP, spm.CorrPlot.TEXT_REP].includes(config.corrPlotType)) {
                this.corrPlotType = config.corrPlotType;
            }
            else {
                console.log("Unknown correlation plot type: " + config.corrPlotType);
            }
            if (!config.corrPlotCS) {
                this.corrPlotCsId = spm.SpConst.CONTINUOUS_CS_IDS[3];
            }
            else if (spm.SpConst.CONTINUOUS_CS_IDS.includes(config.corrPlotCS)) {
                this.corrPlotCsId = config.corrPlotCS;
            }
            else {
                console.log("Unknown correlation color scale: " + config.corrPlotCS);
            }
            this.rotateTitle = config.rotateTitle ? config.rotateTitle : false;
            this.spData = new spm.SpData(config);
            this.initVisibleDimensions();
            this.spData.initFromRowFilter(this.scatterPlotList);
            this.spData.on(spm.SpData.ROW_FILTER_EVENT, ScatterPlotMatrix.prototype.rowFilterChange.bind(this));
        }
        initVisibleDimensions() {
            if (this.spData.dimensions.length < this.visibleDimsCount) {
                this.visibleDimsCount = this.spData.dimensions.length;
            }
            this.xVisibleDimIndex0 = 0;
            this.yVisibleDimIndex0 = 0;
        }
        initTilePlots() {
            this.scatterPlotList.splice(0, this.scatterPlotList.length);
            this.diagPlotList.splice(0, this.diagPlotList.length);
            this.corrPlotList.splice(0, this.corrPlotList.length);
            for (let j = 0; j < this.visibleDimsCount; j++) {
                for (let i = 0; i < this.visibleDimsCount; i++) {
                    const xVisibleDimIndex = this.xVisibleDimIndex0 + i;
                    const yVisibleDimIndex = this.yVisibleDimIndex0 + j;
                    if (xVisibleDimIndex < yVisibleDimIndex) {
                        this.pushNewSP(i, j);
                    }
                    if (xVisibleDimIndex === yVisibleDimIndex) {
                        this.pushNewDP(i, j);
                    }
                    if (xVisibleDimIndex > yVisibleDimIndex) {
                        this.pushNewCP(i, j);
                    }
                }
            }
        }
        rowFilterChange() {
            this.spData.initFromRowFilter(this.scatterPlotList);
            this.scatterPlotList.forEach(plot => {
                const plotSelection = plot.plotSelection();
                plot.drawRegressionPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                plot.drawDistribPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                plot.drawVerViolinPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                plot.drawHorViolinPlots(spm.ScatterPlot.DOMAIN, plotSelection);
                if (plotSelection.size() !== 0) {
                    plot.drawCanvas(false, plotSelection);
                }
            });
            this.diagPlotList.forEach(plot => {
                const plotSelection = plot.plotSelection();
                plot.drawDistribPlots(spm.ScatterPlot.DOMAIN, plotSelection);
            });
            this.corrPlotList.forEach(plot => {
                plot.draw(spm.ScatterPlot.DOMAIN);
            });
        }
        pushNewSP(i, j) {
            const scatterPlot = new spm.ScatterPlot(this.spData, {
                bindto: this.bindto,
                index: i + this.visibleDimsCount * j,
                row: j,
                col: i,
                regressionType: this.regressionType,
                mouseMode: this.mouseMode,
                continuousCsId: this.continuousCsId,
                categoricalCsId: this.categoricalCsId,
                distribVisibility: false,
                distribType: this.distribType,
                corrPlotType: this.corrPlotType,
                corrPlotCsId: this.corrPlotCsId,
                axisVisibility: {
                    xTitle: false,
                    xValues: j === this.visibleDimsCount - 1,
                    yTitle: false,
                    yValues: i === 0
                }
            });
            scatterPlot.setXColumn(this.spData.columns[this.spData.dimensions[this.xVisibleDimIndex0 + i]]);
            scatterPlot.setYColumn(this.spData.columns[this.spData.dimensions[this.yVisibleDimIndex0 + j]]);
            scatterPlot.setZColumn(this.getZColumn());
            this.scatterPlotList.push(scatterPlot);
        }
        pushNewDP(i, j) {
            const diagPlot = new spm.DiagPlot(this.spData, {
                bindto: this.bindto,
                index: i + this.visibleDimsCount * j,
                row: j,
                col: i,
                regressionType: this.regressionType,
                mouseMode: this.mouseMode,
                continuousCsId: this.continuousCsId,
                categoricalCsId: this.categoricalCsId,
                distribVisibility: false,
                distribType: this.distribType,
                corrPlotType: this.corrPlotType,
                corrPlotCsId: this.corrPlotCsId,
                axisVisibility: {
                    xTitle: false,
                    xValues: j === this.visibleDimsCount - 1,
                    yTitle: false,
                    yValues: i === 0
                }
            });
            diagPlot.setXColumn(this.spData.columns[this.spData.dimensions[this.xVisibleDimIndex0 + i]]);
            diagPlot.setZColumn(this.getZColumn());
            this.diagPlotList.push(diagPlot);
        }
        pushNewCP(i, j) {
            const corrPlot = new spm.CorrPlot(this.spData, {
                bindto: this.bindto,
                index: i + this.visibleDimsCount * j,
                row: j,
                col: i,
                regressionType: this.regressionType,
                mouseMode: this.mouseMode,
                continuousCsId: this.continuousCsId,
                categoricalCsId: this.categoricalCsId,
                distribVisibility: false,
                distribType: this.distribType,
                corrPlotType: this.corrPlotType,
                corrPlotCsId: this.corrPlotCsId,
                axisVisibility: {
                    xTitle: true,
                    xValues: true,
                    yTitle: true,
                    yValues: true
                }
            });
            corrPlot.setXColumn(this.spData.columns[this.spData.dimensions[this.xVisibleDimIndex0 + i]]);
            corrPlot.setYColumn(this.spData.columns[this.spData.dimensions[this.yVisibleDimIndex0 + j]]);
            corrPlot.setZColumn(this.getZColumn());
            this.corrPlotList.push(corrPlot);
        }
        getZColumn() {
            if (this.zColumn) {
                return this.zColumn;
            }
            return null;
        }
        // eslint-disable-next-line max-lines-per-function
        buildMainDomElements(config) {
            const controlWidgets = config.controlWidgets ? config.controlWidgets : false;
            d3.select(this.bindto + " .mspDiv").remove();
            const mspDiv = d3.select(this.bindto).append("div")
                .attr("class", "mspDiv")
                .classed("withWidgets", controlWidgets)
                .classed("withoutWidgets", !controlWidgets);
            const controlDiv = mspDiv.append("div").attr("class", "controlDiv");
            const optionalPlotsDiv = controlDiv.append("div")
                .attr("class", "optionalPlotsDiv");
            optionalPlotsDiv.append("div")
                .attr("class", "distribRepDiv")
                .html("Distribution Representation: <span class=\"distribRepSelect\"></span>");
            optionalPlotsDiv.append("div")
                .attr("class", "linearRegrDiv")
                .html(`<input type="checkbox" id="${this.id()}_linearRegr" name="linearRegr"> <label for="${this.id()}_linearRegr">Linear Regression</label>`);
            optionalPlotsDiv.append("div")
                .attr("class", "loessDiv")
                .html(`<input type="checkbox" id="${this.id()}_loess" name="loess"> <label for="${this.id()}_loess">Local Polynomial Regression</label>`);
            const csDiv = controlDiv.append("div")
                .attr("class", "csDiv");
            csDiv.append("div")
                .attr("class", "zAxisUsedDiv")
                .html(`<input type="checkbox" id="${this.id()}_zAxisUsed" name="zAxisUsed" checked> <label for="${this.id()}_zAxisUsed">Use Z Axis</label> <span class="ParamSelect ZAxis"></span>`);
            csDiv.append("div")
                .attr("class", "contCsDiv")
                .html("Continuous Color Scale: <span class=\"contCsSelect\"></span>");
            csDiv.append("div")
                .html("Categorical Color Scale: <span class=\"catCsSelect\"></span>");
            const corrDiv = controlDiv.append("div")
                .attr("class", "corrDiv");
            corrDiv.append("div")
                .attr("class", "corrTypeDiv")
                .html("Correlation Plot Type: <span class=\"corrTypeSelect\"></span>");
            corrDiv.append("div")
                .attr("class", "corrCsDiv")
                .html("Correlation Color Scale: <span class=\"corrCsSelect\"></span>");
            corrDiv.append("div")
                .attr("class", "mouseModeDiv")
                .html("Mouse mode: <span class=\"mouseModeSelect\"></span>");
            mspDiv.append("div").attr("class", "MultiPlot");
        }
        appendPlotSvg() {
            const mspSvg = d3.select(this.bindto + " .MultiPlot")
                .append("svg")
                .attr("width", this.width + ScatterPlotMatrix.margin.l + ScatterPlotMatrix.margin.r)
                .attr("height", this.height + ScatterPlotMatrix.margin.b + ScatterPlotMatrix.margin.t);
            mspSvg.append("g")
                .attr("transform", `translate(${ScatterPlotMatrix.margin.l}, ${ScatterPlotMatrix.margin.t})`)
                .attr("class", "mspGroup");
            this.appendSvgDefs();
            this.appendBrushSliders();
        }
        appendSvgDefs() {
            const svg = d3.select(this.bindto + " svg");
            const defs = svg.append("defs");
            defs.append("clipPath")
                .attr("id", "tile-clip")
                .append("rect");
        }
        appendBrushSliders() {
            this.xBrushSlider = new spm.BrushSlider(this, true);
            this.yBrushSlider = new spm.BrushSlider(this, false);
        }
        updateVisibleDimensions(begin, end, xOriented) {
            if (begin !== undefined && end !== undefined && begin >= 0 && end >= 0) {
                if (xOriented || this.brushSlidersLinked) {
                    this.xVisibleDimIndex0 = begin;
                }
                if (!xOriented || this.brushSlidersLinked) {
                    this.yVisibleDimIndex0 = begin;
                }
                this.visibleDimsCount = end - begin + 1;
                this.tilesNumberChanged();
            }
        }
        tilesNumberChanged() {
            this.removePlots();
            this.initTilePlots();
            this.updatePlots(spm.ScatterPlot.INIT);
        }
        // eslint-disable-next-line max-lines-per-function
        updatePlots(updateType) {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            const tileWidth = (this.width / thisMPlot.visibleDimsCount);
            const tileHeight = (this.height / thisMPlot.visibleDimsCount);
            if (updateType & (spm.ScatterPlot.INIT | spm.ScatterPlot.RANGE)) {
                this.scatterPlotList.forEach(plot => {
                    plot.height = tileHeight;
                    plot.width = tileWidth;
                });
                this.diagPlotList.forEach(plot => {
                    plot.height = tileHeight;
                    plot.hidth = tileWidth;
                });
                this.corrPlotList.forEach(plot => {
                    plot.height = tileHeight;
                    plot.width = tileWidth;
                });
                d3.select(this.bindto + " #tile-clip > rect")
                    .attr("x", 0)
                    .attr("y", spm.ScatterPlot.padding.t)
                    .attr("width", tileWidth - spm.ScatterPlot.padding.r)
                    .attr("height", tileHeight - spm.ScatterPlot.padding.t);
            }
            if (updateType & spm.ScatterPlot.INIT) {
                this.initColHeaders();
                // corrPlot
                mspGroup.selectAll(".corrPlot")
                    .data(this.corrPlotList)
                    .enter().append("g")
                    .attr("class", "corrPlot")
                    .attr("transform", function (plot) {
                    return `translate(${thisMPlot.xSubPlot(plot)}, ${thisMPlot.ySubPlot(plot)})`;
                });
                // diagPlot
                const diagPlot = mspGroup.selectAll(".diagPlot")
                    .data(this.diagPlotList)
                    .enter().append("g")
                    .attr("class", "diagPlot")
                    .attr("transform", function (plot) {
                    return `translate(${thisMPlot.xSubPlot(plot)}, ${thisMPlot.ySubPlot(plot)})`;
                });
                diagPlot.append("g")
                    .attr("class", "axesGroup");
                diagPlot.append("g")
                    .attr("class", "spArea")
                    .attr("clip-path", "url(#tile-clip)");
                diagPlot.append("g")
                    .attr("class", "distribGroup");
                // scatterPlot
                const scatterPlot = mspGroup.selectAll(".scatterPlot")
                    .data(this.scatterPlotList)
                    .enter().append("g")
                    .attr("class", "scatterPlot")
                    .attr("transform", function (plot) {
                    return `translate(${thisMPlot.xSubPlot(plot)}, ${thisMPlot.ySubPlot(plot)})`;
                });
                scatterPlot.append("g")
                    .attr("class", "axesGroup");
                scatterPlot.append("g")
                    .attr("class", "spArea")
                    .attr("clip-path", "url(#tile-clip)");
                scatterPlot.append("g")
                    .attr("class", "distribGroup");
            }
            mspGroup.selectAll(".scatterPlot").each(function (plot) {
                plot.draw(updateType);
            });
            mspGroup.selectAll(".diagPlot").each(function (plot) {
                plot.draw(updateType);
            });
            mspGroup.selectAll(".corrPlot").each(function (plot) {
                plot.draw(updateType);
            });
            mspGroup.selectAll(".cslGroup").style("display", "none");
            if (updateType & spm.ScatterPlot.INIT) {
                this.fixBrush();
            }
        }
        initColHeaders() {
            this.initTopHeaders();
            this.initRightHeaders();
            this.initBottomHeaders();
            this.initLeftHeaders();
        }
        initTopHeaders() {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            const tileWidth = (this.width / thisMPlot.visibleDimsCount);
            mspGroup.selectAll(".topHeader")
                .data(d3.range(this.visibleDimsCount))
                .join(enter => enter.append("text")
                .attr("class", "topHeader Header")
                .on("click", ScatterPlotMatrix.prototype.clickColTitle.bind(thisMPlot)), update => update, exit => exit.remove())
                .classed("input", function (colIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.xVisibleDimIndex0 + colIndex]].isInput(); })
                .classed("output", function (colIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.xVisibleDimIndex0 + colIndex]].isOutput(); })
                .classed("zAxis", function (colIndex) { return thisMPlot.zColumn !== null && thisMPlot.zColumn.dimIndex === thisMPlot.xVisibleDimIndex0 + colIndex; })
                .attr("transform", function (colIndex) {
                if (thisMPlot.rotateTitle) {
                    return `translate(${tileWidth * (colIndex + 0.3)}, -10)rotate(-10)`;
                }
                else {
                    return `translate(${tileWidth * (colIndex + 0.5)}, -10)`;
                }
            })
                .each(function (colIndex) {
                spm.ScatterPlot.tspanColumnTitleBT(d3.select(this), thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.xVisibleDimIndex0 + colIndex]]);
            })
                // @ts-ignore
                .attr("text-anchor", thisMPlot.rotateTitle ? null : "middle");
        }
        initRightHeaders() {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            const tileHeight = (this.height / thisMPlot.visibleDimsCount);
            mspGroup.selectAll(".rightHeader")
                .data(d3.range(this.visibleDimsCount))
                .join(enter => enter.append("text")
                .attr("class", "rightHeader Header")
                .on("click", ScatterPlotMatrix.prototype.clickRowTitle.bind(thisMPlot)), update => update, exit => exit.remove())
                .classed("input", function (rowIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.yVisibleDimIndex0 + rowIndex]].isInput(); })
                .classed("output", function (rowIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.yVisibleDimIndex0 + rowIndex]].isOutput(); })
                .classed("zAxis", function (colIndex) { return thisMPlot.zColumn !== null && thisMPlot.zColumn.dimIndex === thisMPlot.xVisibleDimIndex0 + colIndex; })
                .attr("transform", function (rowIndex) {
                if (thisMPlot.rotateTitle) {
                    return `translate(${thisMPlot.width + 10}, ${tileHeight * (rowIndex + 0.3)})rotate(80)`;
                }
                else {
                    return `translate(${thisMPlot.width + 10}, ${tileHeight * (rowIndex + 0.5)})rotate(90)`;
                }
            })
                .each(function (rowIndex) {
                spm.ScatterPlot.tspanColumnTitleBT(d3.select(this), thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.yVisibleDimIndex0 + rowIndex]]);
            })
                // @ts-ignore
                .attr("text-anchor", thisMPlot.rotateTitle ? null : "middle");
        }
        initBottomHeaders() {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            const tileWidth = (this.width / thisMPlot.visibleDimsCount);
            mspGroup.selectAll(".bottomHeader")
                .data(d3.range(this.visibleDimsCount))
                .join(enter => enter.append("text")
                .attr("class", "bottomHeader Header")
                .on("click", ScatterPlotMatrix.prototype.clickColTitle.bind(thisMPlot)), update => update, exit => exit.remove())
                .classed("input", function (colIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.xVisibleDimIndex0 + colIndex]].isInput(); })
                .classed("output", function (colIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.xVisibleDimIndex0 + colIndex]].isOutput(); })
                .classed("zAxis", function (colIndex) { return thisMPlot.zColumn !== null && thisMPlot.zColumn.dimIndex === thisMPlot.xVisibleDimIndex0 + colIndex; })
                .attr("transform", function (colIndex) {
                if (thisMPlot.rotateTitle) {
                    return `translate(${tileWidth * (colIndex + 0.3)}, ${thisMPlot.height + 55})rotate(-10)`;
                }
                else {
                    return `translate(${tileWidth * (colIndex + 0.5)}, ${thisMPlot.height + 45})`;
                }
            })
                .each(function (colIndex) {
                spm.ScatterPlot.tspanColumnTitleTB(d3.select(this), thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.xVisibleDimIndex0 + colIndex]]);
            })
                // @ts-ignore
                .attr("text-anchor", thisMPlot.rotateTitle ? null : "middle");
        }
        initLeftHeaders() {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            const tileHeight = (this.height / thisMPlot.visibleDimsCount);
            mspGroup.selectAll(".leftHeader")
                .data(d3.range(this.visibleDimsCount))
                .join(enter => enter.append("text")
                .attr("class", "leftHeader Header")
                .on("click", ScatterPlotMatrix.prototype.clickRowTitle.bind(thisMPlot)), update => update, exit => exit.remove())
                .classed("input", function (rowIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.yVisibleDimIndex0 + rowIndex]].isInput(); })
                .classed("output", function (rowIndex) { return thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.yVisibleDimIndex0 + rowIndex]].isOutput(); })
                .classed("zAxis", function (colIndex) { return thisMPlot.zColumn !== null && thisMPlot.zColumn.dimIndex === thisMPlot.xVisibleDimIndex0 + colIndex; })
                .attr("transform", function (rowIndex) {
                if (thisMPlot.rotateTitle) {
                    return `translate(-55, ${tileHeight * (rowIndex + 0.8)})rotate(260)`;
                }
                else {
                    return `translate(-45, ${tileHeight * (rowIndex + 0.5)})rotate(270)`;
                }
            })
                .each(function (rowIndex) {
                spm.ScatterPlot.tspanColumnTitleBT(d3.select(this), thisMPlot.spData.columns[thisMPlot.spData.dimensions[thisMPlot.yVisibleDimIndex0 + rowIndex]]);
            })
                // @ts-ignore
                .attr("text-anchor", thisMPlot.rotateTitle ? null : "middle");
        }
        clickColTitle(colIndex) {
            const dim = this.spData.dimensions[this.xVisibleDimIndex0 + colIndex];
            if (this.zColumn !== null && this.zColumn.dim === dim) {
                this.setZAxis(null);
            }
            else {
                this.setZAxis(dim);
            }
            this.updateZAxisHeaders();
        }
        clickRowTitle(rowIndex) {
            const dim = this.spData.dimensions[this.yVisibleDimIndex0 + rowIndex];
            if (this.zColumn !== null && this.zColumn.dim === dim) {
                this.setZAxis(null);
            }
            else {
                this.setZAxis(dim);
            }
            this.updateZAxisHeaders();
        }
        updateZAxisHeaders() {
            const thisMPlot = this;
            const mspGroup = d3.select(this.bindto + " .MultiPlot .mspGroup");
            mspGroup.selectAll(".Header")
                .classed("zAxis", function (colIndex) { return thisMPlot.zColumn !== null && thisMPlot.zColumn.dimIndex === thisMPlot.xVisibleDimIndex0 + colIndex; });
        }
        xSubPlot(plot) {
            const tileWidth = (this.width / this.visibleDimsCount);
            return plot.col * tileWidth /* + ScatterPlot.margin.l*/;
        }
        ySubPlot(plot) {
            const tileHeight = (this.height / this.visibleDimsCount);
            return plot.row * tileHeight /* + ScatterPlot.margin.t*/;
        }
        //***********************************
        //********** About "ZAxis" **********
        //***********************************
        appendZAxisSelector() {
            const thisMPlot = this;
            d3.selectAll(this.bindto + " .ParamSelect").data([ScatterPlotMatrix.zAxisClass]).
                append("select")
                .on("change", function () {
                thisMPlot.updateZAxisFromGui();
            })
                .selectAll("option")
                .data(this.spData.dimensions)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            if (this.zColumn !== null) {
                const paramIndex = this.spData.dimensions.indexOf(this.zColumn.dim);
                d3.select(this.bindto + " .ParamSelect > select")
                    .property("selectedIndex", paramIndex);
            }
        }
        initZAxisUsedCB() {
            d3.select(`#${this.id()}_zAxisUsed`)
                .property("checked", this.zColumn !== null)
                .on("change", ScatterPlotMatrix.prototype.updateZAxisFromGui.bind(this));
        }
        updateZAxisFromGui() {
            if (d3.select(`#${this.id()}_zAxisUsed`).property("checked")) {
                const zAxisSelectNode = d3.select(this.bindto + " .ParamSelect.ZAxis>select").node();
                if (zAxisSelectNode) {
                    this.setZAxis(this.spData.dimensions[zAxisSelectNode.selectedIndex]);
                }
            }
            else {
                this.setZAxis(null);
            }
        }
        //******************************************************
        //********** "Tooltip/Filter/Zoom" select box **********
        //******************************************************
        appendMouseModeSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .mouseModeSelect").append("select")
                .on("change", ScatterPlotMatrix.prototype.mouseModeChange.bind(thisMPlot))
                .selectAll("option")
                .data(spm.SpConst.mouseModeList)
                .enter().append("option")
                .text(function (d) { return d.label; })
                .attr("value", function (d) { return d.key; });
            this.mouseModeChange();
        }
        mouseModeChange() {
            const mouseModeSelect = d3.select(this.bindto + " .mouseModeSelect > select").node();
            if (mouseModeSelect) {
                this.changeMouseMode(mouseModeSelect.options[mouseModeSelect.selectedIndex].value);
            }
        }
        changeMouseMode(mouseMode) {
            this.mouseMode = mouseMode;
            this.scatterPlotList.forEach(plot => {
                plot.changeMouseMode(mouseMode);
            });
            this.diagPlotList.forEach(plot => {
                plot.changeMouseMode(mouseMode);
            });
            const modeIndex = spm.SpConst.mouseModeList.findIndex(mode => mode.key === mouseMode);
            d3.select(this.bindto + " .mouseModeSelect > select")
                .property("selectedIndex", modeIndex);
            this.fixBrush();
        }
        fixBrush() {
            this.scatterPlotList.forEach(plot => {
                plot.fixBrush();
            });
            this.diagPlotList.forEach(plot => {
                plot.fixBrush();
            });
        }
        //***************************************************************
        //********** About "distribRep/Regression" check boxes **********
        //***************************************************************
        appendDistribRepSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .distribRepSelect").append("select")
                .on("change", function () {
                const rep = spm.SpConst.distribRepList[this.selectedIndex];
                thisMPlot.setDistribType(rep.key === spm.SpConst.histogramRep.key ? spm.DistributionPlot.HISTO_REP : spm.DistributionPlot.DENS_REP);
            })
                .selectAll("option")
                .data(spm.SpConst.distribRepList)
                .enter().append("option")
                .text(function (d) { return d.label; })
                .attr("value", function (d) { return d.key; });
            const histoRep = (this.distribType & spm.DistributionPlot.HISTO_REP) ? spm.SpConst.histogramRep.key : spm.SpConst.densityRep.key;
            const repIndex = spm.SpConst.distribRepList.findIndex(distribRep => distribRep.key === histoRep);
            d3.select(this.bindto + " .distribRepSelect > select")
                .property("selectedIndex", repIndex);
        }
        initRegressionCB() {
            const thisMPlot = this;
            d3.select(`#${this.id()}_linearRegr`)
                .property("checked", (this.regressionType & spm.RegressionPlot.LINEAR_REP) !== 0)
                .on("change", function () {
                if (d3.select(this).property("checked")) {
                    thisMPlot.setRegressionType(thisMPlot.regressionType | spm.RegressionPlot.LINEAR_REP);
                }
                else {
                    thisMPlot.setRegressionType(thisMPlot.regressionType ^ spm.RegressionPlot.LINEAR_REP);
                }
            });
            d3.select(`#${this.id()}_loess`)
                .property("checked", (this.regressionType & spm.RegressionPlot.LOESS_REP) !== 0)
                .on("change", function () {
                if (d3.select(this).property("checked")) {
                    thisMPlot.setRegressionType(thisMPlot.regressionType | spm.RegressionPlot.LOESS_REP);
                }
                else {
                    thisMPlot.setRegressionType(thisMPlot.regressionType ^ spm.RegressionPlot.LOESS_REP);
                }
            });
        }
        appendContCsSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .contCsSelect").append("select")
                .on("change", function () {
                const contCsKey = spm.SpConst.CONTINUOUS_CS_IDS[this.selectedIndex];
                thisMPlot.setContinuousColorScale(contCsKey);
            })
                .selectAll("option")
                .data(spm.SpConst.CONTINUOUS_CS_IDS)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const contCsIndex = spm.SpConst.CONTINUOUS_CS_IDS.indexOf(this.continuousCsId);
            d3.select(this.bindto + " .contCsSelect > select")
                .property("selectedIndex", contCsIndex);
        }
        appendCatCsSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .catCsSelect").append("select")
                .on("change", function () {
                const catCsKey = spm.SpConst.CATEGORIAL_CS_IDS[this.selectedIndex];
                thisMPlot.setCategoricalColorScale(catCsKey);
            })
                .selectAll("option")
                .data(spm.SpConst.CATEGORIAL_CS_IDS)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const catCsIndex = spm.SpConst.CATEGORIAL_CS_IDS.indexOf(this.categoricalCsId);
            d3.select(this.bindto + " .catCsSelect > select")
                .property("selectedIndex", catCsIndex);
        }
        appendCorrTypeSelect() {
            const thisMPlot = this;
            const corrPlotTypes = [spm.CorrPlot.CIRCLES_REP, spm.CorrPlot.TEXT_REP];
            d3.select(this.bindto + " .corrTypeSelect").append("select")
                .on("change", function () {
                const corrPlotType = corrPlotTypes[this.selectedIndex];
                thisMPlot.setCorrPlotType(corrPlotType);
            })
                .selectAll("option")
                .data(corrPlotTypes)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const corrTypeIndex = corrPlotTypes.indexOf(this.corrPlotType);
            d3.select(this.bindto + " .corrTypeSelect > select")
                .property("selectedIndex", corrTypeIndex);
        }
        appendCorrCsSelect() {
            const thisMPlot = this;
            d3.select(this.bindto + " .corrCsSelect").append("select")
                .on("change", function () {
                const contCsKey = spm.SpConst.CONTINUOUS_CS_IDS[this.selectedIndex];
                thisMPlot.setCorrPlotCS(contCsKey);
            })
                .selectAll("option")
                .data(spm.SpConst.CONTINUOUS_CS_IDS)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const corrCsIndex = spm.SpConst.CONTINUOUS_CS_IDS.indexOf(this.corrPlotCsId);
            d3.select(this.bindto + " .corrCsSelect > select")
                .property("selectedIndex", corrCsIndex);
        }
        //**************************************************
        //********** API (called by R htmlwidget) **********
        //**************************************************
        // eslint-disable-next-line max-lines-per-function
        setZAxis(dim, dontRedraw) {
            if (dim && !this.spData.columns[dim]) {
                console.log("setZAxis called with unknown dim:", dim);
                return;
            }
            const thisMPlot = this;
            this.zColumn = dim
                ? this.spData.columns[dim]
                : null;
            this.scatterPlotList.forEach(plot => {
                const plotDim = plot.zColumn === null
                    ? null
                    : plot.zColumn.dim;
                if (plotDim !== dim) {
                    plot.setZColumn(thisMPlot.zColumn);
                    if (!dontRedraw) {
                        plot.draw(spm.ScatterPlot.Z_AXIS);
                    }
                }
            });
            this.diagPlotList.forEach(plot => {
                const plotDim = plot.zColumn === null
                    ? null
                    : plot.zColumn.dim;
                if (plotDim !== dim) {
                    plot.setZColumn(thisMPlot.zColumn);
                    if (!dontRedraw) {
                        plot.draw(spm.ScatterPlot.Z_AXIS);
                    }
                }
            });
            this.corrPlotList.forEach(plot => {
                const plotDim = plot.zColumn === null
                    ? null
                    : plot.zColumn.dim;
                if (plotDim !== dim) {
                    plot.setZColumn(thisMPlot.zColumn);
                    if (!dontRedraw) {
                        plot.draw(spm.ScatterPlot.Z_AXIS);
                    }
                }
            });
            d3.select(`#${this.id()}_zAxisUsed`).property("checked", this.zColumn !== null);
            if (this.zColumn !== null) {
                const zAxisSelectNode = d3.select(this.bindto + " .ParamSelect.ZAxis>select").node();
                if (zAxisSelectNode) {
                    const selectedIndex = this.spData.dimensions.indexOf(this.zColumn.dim);
                    if (selectedIndex === -1) {
                        console.log("Dim of Z axis not found => selectedIndex cannot be updated");
                    }
                    else {
                        zAxisSelectNode.selectedIndex = selectedIndex;
                    }
                }
            }
        }
        setDistribType(distribType) {
            if (distribType & (spm.DistributionPlot.HISTO_REP | spm.DistributionPlot.DENS_REP)) {
                this.distribType = distribType;
                this.scatterPlotList.forEach(plot => {
                    plot.distribRepChange(distribType);
                });
                this.diagPlotList.forEach(plot => {
                    plot.distribRepChange(distribType);
                });
            }
            else {
                console.log("Invalid distribution type code: " + distribType);
            }
        }
        setRegressionType(regressionType) {
            if (regressionType === 0 || regressionType & (spm.RegressionPlot.LINEAR_REP | spm.RegressionPlot.LOESS_REP)) {
                this.regressionType = regressionType;
                this.scatterPlotList.forEach(plot => {
                    plot.regressionRepChange(regressionType);
                });
            }
            else {
                console.log("Invalid regression type code: " + regressionType);
            }
        }
        setContinuousColorScale(continuousCsId) {
            if (spm.SpConst.CONTINUOUS_CS_IDS.includes(continuousCsId)) {
                this.continuousCsId = continuousCsId;
                this.scatterPlotList.forEach(plot => {
                    plot.continuousCsId = continuousCsId;
                });
                this.diagPlotList.forEach(plot => {
                    plot.continuousCsId = continuousCsId;
                });
                this.updatePlots(spm.ScatterPlot.PALETTE);
            }
            else {
                console.log("Unknown continuous color scale: " + continuousCsId);
            }
        }
        setCategoricalColorScale(categoricalCsId) {
            if (spm.SpConst.CATEGORIAL_CS_IDS.includes(categoricalCsId)) {
                this.categoricalCsId = categoricalCsId;
                this.scatterPlotList.forEach(plot => {
                    plot.categoricalCsId = categoricalCsId;
                });
                this.diagPlotList.forEach(plot => {
                    plot.categoricalCsId = categoricalCsId;
                });
                this.corrPlotList.forEach(plot => {
                    plot.categoricalCsId = categoricalCsId;
                });
                this.updatePlots(spm.ScatterPlot.PALETTE);
            }
            else {
                console.log("Unknown categorical color scale: " + categoricalCsId);
            }
        }
        setCorrPlotType(corrPlotType) {
            if ([spm.CorrPlot.CIRCLES_REP, spm.CorrPlot.TEXT_REP].includes(corrPlotType)) {
                this.corrPlotType = corrPlotType;
                this.corrPlotList.forEach(plot => {
                    plot.repType = corrPlotType;
                    plot.draw(spm.ScatterPlot.SHAPE);
                });
            }
            else {
                console.log("Unknown correlation plot type: " + corrPlotType);
            }
        }
        setCorrPlotCS(corrPlotCsId) {
            if (spm.SpConst.CONTINUOUS_CS_IDS.includes(corrPlotCsId)) {
                this.corrPlotCsId = corrPlotCsId;
                this.corrPlotList.forEach(plot => {
                    plot.corrCsId = corrPlotCsId;
                });
                this.updatePlots(spm.ScatterPlot.PALETTE);
            }
            else {
                console.log("Unknown correlation color scale: " + corrPlotCsId);
            }
        }
        setKeptColumns(keptColumns) {
            const thisPlot = this;
            if (Array.isArray(keptColumns)) {
                this.spData.dimensions = d3.keys(this.spData.sampleData[0]).filter((_dim, i) => keptColumns[i]);
            }
            else {
                this.spData.dimensions = d3.keys(this.spData.sampleData[0]).filter(function (dim) {
                    let toKeep = thisPlot.spData.dimensions.includes(dim);
                    if (typeof keptColumns[dim] !== "undefined") {
                        toKeep = keptColumns[dim];
                    }
                    return toKeep;
                });
            }
            this.initVisibleDimensions();
            this.tilesNumberChanged();
            this.xBrushSlider.update();
            this.yBrushSlider.update();
        }
        getPlotConfig() {
            const allDimensions = d3.keys(this.spData.sampleData[0]);
            const controlWidgets = d3.select(this.bindto + " .mspDiv").classed("withWidgets");
            const categorical = allDimensions.map(dim => this.spData.columns[dim]
                ? this.spData.columns[dim].categories
                : null);
            const inputColumns = allDimensions.map(dim => this.spData.columns[dim] && this.spData.columns[dim].ioType === spm.Column.INPUT);
            const keptColumns = allDimensions.map(dim => this.spData.dimensions.includes(dim));
            const zAxisDim = this.zColumn === null
                ? null
                : this.zColumn.dim;
            const columnLabels = allDimensions.map(dim => this.spData.columns[dim] && this.spData.columns[dim].label
                ? this.spData.columns[dim].label
                : dim);
            return {
                data: [],
                rowLabels: this.spData.rowLabels,
                controlWidgets: controlWidgets,
                categorical: categorical,
                inputColumns: inputColumns,
                keptColumns: keptColumns,
                zAxisDim: zAxisDim,
                distribType: this.distribType,
                regressionType: this.regressionType,
                corrPlotType: this.corrPlotType,
                corrPlotCS: this.corrPlotCsId,
                rotateTitle: this.rotateTitle,
                columnLabels: columnLabels,
                continuousCS: this.continuousCsId,
                categoricalCS: this.categoricalCsId
            };
        }
    }
    ScatterPlotMatrix.margin = { t: 95, r: 95, b: 95, l: 95 };
    ScatterPlotMatrix.zAxisClass = "ZAxis";
    ScatterPlotMatrix.PLOT_EVENT = "plotEvent";
    ScatterPlotMatrix.SELECTION_EVENT = "selectionChange";
    spm.ScatterPlotMatrix = ScatterPlotMatrix;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class SelectionPad {
        constructor(multipleScatterPlot) {
            // Index of last selected row (useful when Shift key is used)
            this.lastSelectedPlotIndex = 0;
            this.selectedPlots = new Set();
            this.msp = multipleScatterPlot;
            this.selectionPadId = null;
        }
        ;
        generate(selectionPadId) {
            this.selectionPadId = selectionPadId;
            this.selectedPlots.add(this.msp.scatterPlotList[0]);
            return this;
        }
        update() {
            const thisPad = this;
            const selectionPad = (this.selectionPadId && !d3.select("#" + this.selectionPadId).empty())
                ? d3.select("#" + this.selectionPadId)
                : d3.select(this.msp.bindto + " .selectionPad");
            selectionPad.select("svg").remove();
            const svg = selectionPad.append("svg")
                .attr("width", SelectionPad.spSize + 2 * SelectionPad.spMargin)
                .attr("height", SelectionPad.spSize + 2 * SelectionPad.spMargin)
                .append("g")
                .attr("transform", "translate(" + SelectionPad.spMargin + "," + SelectionPad.spMargin + ")");
            const visiblePlotList = thisPad.msp.visibilityPad.visibleScatterPlots();
            svg.selectAll(".selectionCell")
                .data(visiblePlotList)
                .enter().append("rect")
                .attr("class", "selectionCell")
                .attr("x", function (plot) {
                return thisPad.msp.visibilityPad.vcell(plot).vcol * SelectionPad.spSize / thisPad.msp.visibilityPad.nCol;
            })
                .attr("y", function (plot) {
                return thisPad.msp.visibilityPad.vcell(plot).vrow * SelectionPad.spSize / thisPad.msp.visibilityPad.nRow;
            })
                .attr("width", SelectionPad.spSize / this.msp.visibilityPad.nCol)
                .attr("height", SelectionPad.spSize / this.msp.visibilityPad.nRow)
                .style("fill", function (plot) {
                return thisPad.selectedPlots.has(plot) ? "steelblue" : "#999";
            })
                .attr("fill-opacity", 0.8)
                .style("stroke", "aliceblue")
                .style("stroke-width", "1")
                .on("mouseover", function () {
                d3.select(this).attr("fill-opacity", 1);
            })
                .on("mouseout", function () {
                d3.select(this).attr("fill-opacity", 0.8);
            })
                .on("click", function (plot) {
                thisPad.click(plot);
            });
            return this;
        }
        click(plot) {
            const thisPad = this;
            let selectionPad = d3.select("#selectionPad");
            if (selectionPad.empty()) {
                selectionPad = d3.select(this.msp.bindto + " .selectionPad");
            }
            const svg = selectionPad.select("svg");
            const plotIndex = plot.index;
            if (d3.event.ctrlKey && d3.event.shiftKey && this.lastSelectedPlotIndex !== -1) {
                // @ts-ignore
                const range = plotIndex < this.lastSelectedPlotIndex
                    ? d3.range(plotIndex, this.lastSelectedPlotIndex + 1)
                    : d3.range(this.lastSelectedPlotIndex, plotIndex + 1);
                this.addSelection(range);
                this.lastSelectedPlotIndex = plotIndex;
            }
            else if (d3.event.shiftKey && this.lastSelectedPlotIndex !== -1) {
                // @ts-ignore
                const range = plotIndex < this.lastSelectedPlotIndex
                    ? d3.range(plotIndex, this.lastSelectedPlotIndex + 1)
                    : d3.range(this.lastSelectedPlotIndex, plotIndex + 1);
                this.setSelection(range);
                this.lastSelectedPlotIndex = plotIndex;
            }
            else if (d3.event.ctrlKey) {
                if (this.selectedPlots.has(plot)) {
                    this.lastSelectedPlotIndex = -1;
                    this.removeSelection([plotIndex]);
                }
                else {
                    this.lastSelectedPlotIndex = plotIndex;
                    this.addSelection([plotIndex]);
                }
            }
            else {
                this.lastSelectedPlotIndex = plotIndex;
                this.setSelection([plotIndex]);
            }
            svg.selectAll(".selectionCell")
                .style("fill", function (plot2) {
                return thisPad.selectedPlots.has(plot2) ? "steelblue" : "#999";
            });
            this.sendSelectionEvent();
        }
        addSelection(range) {
            this.rangePlots(range).forEach(plot => this.selectedPlots.add(plot));
        }
        setSelection(range) {
            this.selectedPlots.clear();
            this.rangePlots(range).forEach(plot => this.selectedPlots.add(plot));
        }
        removeSelection(range) {
            this.rangePlots(range).forEach(plot => this.selectedPlots.delete(plot));
        }
        rangePlots(range) {
            const visiblePlots = this.msp.visibilityPad.visibleScatterPlots();
            return visiblePlots.filter(plot => range.includes(plot.index));
        }
        updateAxesSelectors() {
            const plot = [...this.selectedPlots][0];
            this.updateXSelector(plot.xColumn.dim);
            this.updateYSelector(plot.yColumn.dim);
            if (plot.zColumn !== null) {
                this.updateZSelector(plot.zColumn.dim);
            }
        }
        updateXSelector(dim) {
            const xAxisSelectNode = d3.select(this.msp.bindto + " .ParamSelect.XAxis>select").node();
            if (xAxisSelectNode) {
                const selectedIndex = this.msp.spData.dimensions.indexOf(dim);
                if (selectedIndex === -1) {
                    console.log("Dim of X axis not found => selectedIndex cannot be updated");
                }
                else {
                    xAxisSelectNode.selectedIndex = selectedIndex;
                }
            }
        }
        updateYSelector(dim) {
            const yAxisSelectNode = d3.select(this.msp.bindto + " .ParamSelect.YAxis>select").node();
            if (yAxisSelectNode) {
                const selectedIndex = this.msp.spData.dimensions.indexOf(dim);
                if (selectedIndex === -1) {
                    console.log("Dim of Y axis not found => selectedIndex cannot be updated");
                }
                else {
                    yAxisSelectNode.selectedIndex = selectedIndex;
                }
            }
        }
        updateZSelector(dim) {
            const zAxisSelectNode = d3.select(this.msp.bindto + " .ParamSelect.ZAxis>select").node();
            if (zAxisSelectNode) {
                const selectedIndex = this.msp.spData.dimensions.indexOf(dim);
                if (selectedIndex === -1) {
                    console.log("Dim of Z axis not found => selectedIndex cannot be updated");
                }
                else {
                    zAxisSelectNode.selectedIndex = selectedIndex;
                }
            }
        }
        setXAxis(dim) {
            if (!this.msp.spData.columns[dim]) {
                console.log("setXAxis called with unknown dim:", dim);
                return;
            }
            const thisPad = this;
            this.selectedPlots.forEach(plot => {
                if (plot.xColumn.dim !== dim) {
                    plot.setXColumn(thisPad.msp.spData.columns[dim]);
                    plot.draw(spm.ScatterPlot.SHAPE);
                }
            });
            const plot = [...this.selectedPlots][0];
            this.updateXSelector(plot.xColumn.dim);
        }
        setYAxis(dim) {
            if (!this.msp.spData.columns[dim]) {
                console.log("setYAxis called with unknown dim:", dim);
                return;
            }
            const thisPad = this;
            this.selectedPlots.forEach(plot => {
                if (plot.yColumn.dim !== dim) {
                    plot.setYColumn(thisPad.msp.spData.columns[dim]);
                    plot.draw(spm.ScatterPlot.SHAPE);
                }
            });
            const plot = [...this.selectedPlots][0];
            this.updateYSelector(plot.yColumn.dim);
        }
        setZAxis(dim) {
            if (dim !== null && !this.msp.spData.columns[dim]) {
                console.log("setZAxis called with unknown dim:", dim);
                return;
            }
            const zColumn = dim === null
                ? null
                : this.msp.spData.columns[dim];
            this.selectedPlots.forEach(plot => {
                const plotDim = plot.zColumn === null
                    ? null
                    : plot.zColumn.dim;
                if (plotDim !== dim) {
                    plot.setZColumn(zColumn);
                    plot.draw(spm.ScatterPlot.Z_AXIS);
                }
            });
            d3.select(`#${this.msp.id()}_zAxisUsed`).property("checked", zColumn !== null);
            if (zColumn !== null) {
                this.updateZSelector(zColumn.dim);
            }
        }
        sendSelectionEvent() {
            this.updateAxesSelectors();
            const selectionValue = [...this.selectedPlots].map(plot => {
                const zDim = plot.zColumn === null
                    ? null
                    : plot.zColumn.dim;
                return {
                    plotIndex: plot.index,
                    xDim: plot.xColumn.dim,
                    yDim: plot.yColumn.dim,
                    zDim: zDim
                };
            });
            const eventDescr = {
                type: spm.MultipleScatterPlot.SELECTION_EVENT,
                value: selectionValue
            };
            this.msp.dispatch.call(spm.MultipleScatterPlot.PLOT_EVENT, undefined, eventDescr);
        }
    }
    SelectionPad.spSize = 60;
    SelectionPad.spMargin = 1;
    spm.SelectionPad = SelectionPad;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class SpConst {
    }
    SpConst.CONTINUOUS_CS = {
        // From d3-scale.
        Viridis: d3.interpolateViridis,
        Inferno: d3.interpolateInferno,
        Magma: d3.interpolateMagma,
        Plasma: d3.interpolatePlasma,
        Warm: d3.interpolateWarm,
        Cool: d3.interpolateCool,
        Rainbow: d3.interpolateRainbow,
        CubehelixDefault: d3.interpolateCubehelixDefault,
        // From d3-scale-chromatic
        Blues: d3.interpolateBlues,
        Greens: d3.interpolateGreens,
        Greys: d3.interpolateGreys,
        Oranges: d3.interpolateOranges,
        Purples: d3.interpolatePurples,
        Reds: d3.interpolateReds,
        BuGn: d3.interpolateBuGn,
        BuPu: d3.interpolateBuPu,
        GnBu: d3.interpolateGnBu,
        OrRd: d3.interpolateOrRd,
        PuBuGn: d3.interpolatePuBuGn,
        PuBu: d3.interpolatePuBu,
        PuRd: d3.interpolatePuRd,
        RdBu: d3.interpolateRdBu,
        RdPu: d3.interpolateRdPu,
        YlGnBu: d3.interpolateYlGnBu,
        YlGn: d3.interpolateYlGn,
        YlOrBr: d3.interpolateYlOrBr,
        YlOrRd: d3.interpolateYlOrRd
    };
    SpConst.CONTINUOUS_CS_IDS = Object.keys(SpConst.CONTINUOUS_CS);
    SpConst.CATEGORIAL_CS = {
        Category10: d3.scaleOrdinal(d3.schemeCategory10),
        Accent: d3.scaleOrdinal(d3.schemeAccent),
        Dark2: d3.scaleOrdinal(d3.schemeDark2),
        Paired: d3.scaleOrdinal(d3.schemePaired),
        Set1: d3.scaleOrdinal(d3.schemeSet1)
    };
    SpConst.CATEGORIAL_CS_IDS = Object.keys(SpConst.CATEGORIAL_CS);
    SpConst.dblClickDelay = 350;
    SpConst.histogramRep = {
        key: "histogramRep",
        label: "Histogram"
    };
    SpConst.densityRep = {
        key: "densityRep",
        label: "Density Plot"
    };
    SpConst.distribRepList = [SpConst.histogramRep, SpConst.densityRep];
    SpConst.tooltipMouse = {
        key: "tooltip",
        label: "Tooltip"
    };
    SpConst.filterMouse = {
        key: "filter",
        label: "Filter"
    };
    SpConst.zoomMouse = {
        key: "zoom",
        label: "Zoom"
    };
    SpConst.mouseModeList = [SpConst.tooltipMouse, SpConst.filterMouse, SpConst.zoomMouse];
    SpConst.CAT_RATIO = 4;
    SpConst.NO_CAT_COLOR = "#43665e";
    SpConst.LIGHTER_NO_CAT_COLOR = "#69b3a2";
    spm.SpConst = SpConst;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class SpData {
        // eslint-disable-next-line max-lines-per-function
        constructor(config) {
            this.dimensions = [];
            this.rowLabels = null;
            this.sampleData = [];
            this.cutSampleData = null;
            this.columns = {}; // Column for each dimension
            this.jitterXValues = [];
            this.jitterYValues = [];
            this.cutRows = [];
            this.highlightedPoint = null;
            this.dispatch = d3.dispatch(SpData.ROW_FILTER_EVENT, SpData.HL_POINT_EVENT, SpData.HL_GRAPH_EVENT);
            this.rowLabels = config.rowLabels;
            const thisData = this;
            SpData.checkData(config);
            SpData.checkCategorical(config);
            SpData.checkColumnLabels(config);
            SpData.checkInputColumns(config);
            // Init 'sampleData'
            this.sampleData = [];
            config.data.forEach(function (r) {
                const curRow = {};
                config.data.columns.forEach((dim, i) => {
                    const categories = Array.isArray(config.categorical)
                        ? config.categorical[i]
                        : null;
                    const cellValue = r[dim];
                    if (typeof cellValue === "undefined") {
                        curRow[dim] = NaN;
                    }
                    else if (categories) {
                        let catIndex = categories.indexOf(cellValue.toString());
                        if (catIndex === -1) {
                            catIndex = categories.indexOf(+cellValue);
                        }
                        curRow[dim] = (catIndex === -1) ? NaN : catIndex;
                    }
                    else {
                        curRow[dim] = +cellValue;
                    }
                });
                thisData.sampleData.push(curRow);
            });
            // Build 'Column' instances and init jitter values
            const allDimensions = d3.keys(this.sampleData[0]);
            const nanColumns = allDimensions.map(dim => this.sampleData.every(row => isNaN(row[dim])));
            this.dimensions = allDimensions.filter((_dim, i) => !(nanColumns[i] || (Array.isArray(config.keptColumns) && !config.keptColumns[i])));
            allDimensions.forEach((dim, i) => {
                const isInput = Array.isArray(config.inputColumns) ? config.inputColumns[i] : true;
                this.columns[dim] = new spm.Column(dim, i, this, Array.isArray(config.columnLabels) ? config.columnLabels[i] : dim, Array.isArray(config.categorical) ? config.categorical[i] : null, isInput ? spm.Column.INPUT : spm.Column.OUTPUT);
                if (this.columns[dim].categories !== null && !thisData.jitterXValues.length) {
                    thisData.jitterXValues = this.sampleData
                        .map(_row => (Math.random() - 0.5) / spm.SpConst.CAT_RATIO);
                    thisData.jitterYValues = this.sampleData
                        .map(_row => (Math.random() - 0.5) / spm.SpConst.CAT_RATIO);
                }
            });
        }
        static checkData(config) {
            if (!Array.isArray(config.data)) {
                throw new Error("given dataset is not a D3 friendly (row-oriented) data");
            }
            if (config.data.length === 0) {
                throw new Error("given dataset contains no line)");
            }
            if (typeof config.data.columns === "undefined") {
                config.data.columns = d3.keys(config.data[0]);
            }
        }
        static checkCategorical(config) {
            if (config.categorical) {
                if (Array.isArray(config.categorical)) {
                    if (config.categorical.length !== config.data.columns.length) {
                        console.log("Length of 'categorical' must be equal to the number of columns of 'data'");
                        config.categorical = null;
                    }
                }
                else {
                    console.log("'categorical' must be an array");
                    config.categorical = null;
                }
            }
        }
        static checkColumnLabels(config) {
            if (config.columnLabels) {
                if (Array.isArray(config.columnLabels)) {
                    if (config.columnLabels.length !== config.data.columns.length) {
                        console.log("Length of 'columnLabels' must be equal to the number of columns of 'data'");
                        config.columnLabels = null;
                    }
                }
                else {
                    console.log("'columnLabels' must be an array");
                    config.columnLabels = null;
                }
            }
        }
        static checkInputColumns(config) {
            if (config.inputColumns) {
                if (Array.isArray(config.inputColumns)) {
                    if (config.inputColumns.length !== config.data.columns.length) {
                        console.log("Length of 'inputColumns' must be equal to the number of columns of 'data'");
                        config.inputColumns = null;
                    }
                }
                else {
                    console.log("'inputColumns' must be an array");
                    config.inputColumns = null;
                }
            }
        }
        initFromRowFilter(scatterPlotList) {
            const thisData = this;
            if (this.cutRows.length !== this.sampleData.length) {
                this.cutRows = new Array(this.sampleData.length);
            }
            this.sampleData.forEach(function (row, i) {
                const isKept = scatterPlotList.every(function (scatterPlot) {
                    return scatterPlot.xRowFilter.isKeptRow(row)
                        && scatterPlot.yRowFilter.isKeptRow(row);
                });
                thisData.cutRows[i] = isKept;
            });
            this.cutSampleData = null;
        }
        cutData() {
            const thisData = this;
            if (this.cutSampleData === null) {
                this.cutSampleData = this.sampleData.filter((_row, i) => thisData.cutRows[i]);
            }
            return this.cutSampleData;
        }
        rowFilterChange() {
            this.dispatch.call(SpData.ROW_FILTER_EVENT, undefined, SpData.ROW_FILTER_EVENT);
        }
        getHlPoint() {
            return this.highlightedPoint;
        }
        setHlPoint(hlPoint) {
            this.highlightedPoint = hlPoint;
            this.dispatch.call(SpData.HL_POINT_EVENT, undefined, SpData.HL_POINT_EVENT);
        }
        on(type, callback) {
            // @ts-ignore
            this.dispatch.on(type, callback);
        }
    }
    SpData.ROW_FILTER_EVENT = "rowFilterEvent";
    SpData.HL_POINT_EVENT = "hlPointEvent";
    SpData.HL_GRAPH_EVENT = "hlGraphEvent";
    spm.SpData = SpData;
})(spm || (spm = {}));
// eslint-disable-next-line no-unused-vars
var spm;
(function (spm) {
    class VisibilityPad {
        constructor(multipleScatterPlot) {
            this.nCol = 0;
            this.nRow = 0;
            this.hidePlots = new Set();
            this.msp = multipleScatterPlot;
        }
        ;
        // eslint-disable-next-line max-lines-per-function
        generate(visibilityPadId) {
            const thisPad = this;
            const visibilityPad = (visibilityPadId && !d3.select("#" + visibilityPadId).empty())
                ? d3.select("#" + visibilityPadId)
                : d3.select(this.msp.bindto + " .visibilityPad");
            visibilityPad.select("svg").remove();
            const vpSvg = visibilityPad.append("svg")
                .attr("width", VisibilityPad.vpSize + 2 * VisibilityPad.vpMargin)
                .attr("height", VisibilityPad.vpSize + 2 * VisibilityPad.vpMargin)
                .append("g")
                .attr("transform", "translate(" + VisibilityPad.vpMargin + "," + VisibilityPad.vpMargin + ")");
            vpSvg.selectAll(".visibityCell")
                .data(this.msp.scatterPlotList)
                .enter().append("rect")
                .attr("class", "visibityCell")
                .style("fill", function (plot) { return thisPad.hidePlots.has(plot) ? "#999" : "steelblue"; })
                .style("stroke", "aliceblue")
                .style("stroke-width", "1")
                .attr("fill-opacity", 0.8)
                .attr("x", function (plot) {
                return plot.col * VisibilityPad.vpSize / spm.MultipleScatterPlot.grid.nCol;
            })
                .attr("y", function (plot) {
                return plot.row * VisibilityPad.vpSize / spm.MultipleScatterPlot.grid.nRow;
            })
                .attr("height", VisibilityPad.vpSize / spm.MultipleScatterPlot.grid.nCol)
                .attr("width", VisibilityPad.vpSize / spm.MultipleScatterPlot.grid.nRow)
                .on("mouseover", function (plot) {
                d3.select(this).attr("fill-opacity", 1);
                thisPad.showScatterNumber(plot);
            })
                .on("mouseout", function () {
                d3.select(this).attr("fill-opacity", 0.8);
                d3.selectAll(thisPad.msp.bindto + " .scatterNumber").style("display", "none");
            })
                .on("click", function (plot) {
                const visible = thisPad.toogleVisibility(plot);
                d3.select(this).style("fill", visible ? "steelblue" : "#999");
                thisPad.displayedPlotsChange();
                thisPad.msp.removePlots();
                thisPad.msp.updatePlots(spm.ScatterPlot.INIT);
                thisPad.showScatterNumber(plot);
                thisPad.msp.selectionPad.update();
                thisPad.msp.fixBrush();
            });
            this.displayedPlotsChange();
            return this;
        }
        showScatterNumber(plot) {
            d3.selectAll(this.msp.bindto + " .scatterNumber").style("display", "block");
            d3.selectAll(this.msp.bindto + " .scatterPlot").select(".scatterNumber")
                .classed("greyed", function (plot2) {
                return plot.row !== plot2.row || plot.col !== plot2.col;
            });
        }
        toogleVisibility(plot) {
            if (this.hidePlots.has(plot)) {
                this.hidePlots.delete(plot);
                return true;
            }
            else {
                this.hidePlots.add(plot);
                return false;
            }
        }
        visibleScatterPlots() {
            return this.msp.scatterPlotList.filter(plot => !this.hidePlots.has(plot));
        }
        vcell(plot) {
            const visiblePlotList = this.visibleScatterPlots();
            const vi = visiblePlotList.indexOf(plot);
            return {
                vrow: Math.floor(vi / this.nCol),
                vcol: vi % this.nCol
            };
        }
        visible(plot) {
            return !this.hidePlots.has(plot);
        }
        displayedPlotsChange() {
            const visiblePlotList = this.visibleScatterPlots();
            this.nCol = Math.ceil(Math.sqrt(visiblePlotList.length));
            this.nRow = Math.ceil(visiblePlotList.length / this.nCol);
        }
    }
    VisibilityPad.vpSize = 60;
    VisibilityPad.vpMargin = 1;
    spm.VisibilityPad = VisibilityPad;
})(spm || (spm = {}));

//# sourceMappingURL=maps/spm-msp.js.map
