/* eslint-disable */
// @ts-ignore
HTMLWidgets.widget({

    name: "scatterPlotMatrix",

    type: "output",

    factory: function(el, width, height) {
        function js2RIndex(index) {
            return (index !== null) ? index + 1 : index;
        }

        // @ts-ignore
        const scatterPlotMatrix = new spm.ScatterPlotMatrix(el.id, width, height);

        return {
            renderValue: function(config) {
                // Add a reference to the widget from the HTML element
                // @ts-ignore
                document.getElementById(scatterPlotMatrix.id()).widget = this;

                // If htmlwidget is included in Shiny app, listen JavaScript messages sent from Shiny
                if (HTMLWidgets.shinyMode) {
                    ["setDistribType", "setRegressionType", "setCorrPlotType", "setCorrPlotCS", "setContinuousColorScale", "setCategoricalColorScale", "setKeptColumns", "changeMouseMode", "setXAxis", "setYAxis", "setZAxis", "getPlotConfig"].forEach(func => {
                        Shiny.addCustomMessageHandler("scatterPlotMatrix:" + func, function(message) {
                            var el = document.getElementById(message.id);
                            if (el) {
                                el.widget[func](message);
                            }
                        });
                    });

                    // Listen event sent by the scatterPlotMatrix
                    const eventInputId = config.eventInputId !== null ? config.eventInputId : spm.ScatterPlotMatrix.PLOT_EVENT;
                    scatterPlotMatrix.on(spm.ScatterPlotMatrix.PLOT_EVENT, function (event) {
                        if (event.type === spm.ScatterPlotMatrix.SELECTION_EVENT) {
                            event.value.forEach(selection => {
                                selection.plotIndex = js2RIndex(selection.plotIndex);

                            })
                        }
                        // Forward 'event' to Shiny through the reactive input 'eventInputId'
                        Shiny.setInputValue(eventInputId, event, {priority: "event"});
                    });
                }

                const controlWidgets = (config.controlWidgets === null) 
                    ? !HTMLWidgets.shinyMode : 
                    config.controlWidgets;
                // @ts-ignore
                scatterPlotMatrix.generate({
                    // @ts-ignore
                    data: HTMLWidgets.dataframeToD3(config.data),
                    rowLabels: config.rowLabels,
                    controlWidgets: controlWidgets,
                    categorical: config.categorical,
                    inputColumns: config.inputColumns,
                    keptColumns: config.keptColumns,
                    zAxisDim: config.zAxisDim,
                    distribType: config.distribType,
                    regressionType: config.regressionType,
                    corrPlotType: config.corrPlotType,
                    corrPlotCS: config.corrPlotCS,
                    rotateTitle : config.rotateTitle,
                    columnLabels: config.columnLabels,
                    continuousCS: config.continuousCS,
                    categoricalCS: config.categoricalCS
                });
            }, // End 'renderValue'

            setDistribType: function(params) {
                scatterPlotMatrix.setDistribType(params.distribType);
            },

            setRegressionType: function(params) {
                scatterPlotMatrix.setRegressionType(params.regressionType);
            },

            setCorrPlotType: function(params) {
                scatterPlotMatrix.setCorrPlotType(params.corrPlotType);
            },

            setCorrPlotCS: function(params) {
                scatterPlotMatrix.setCorrPlotCS(params.corrPlotCsId);
            },

            setContinuousColorScale: function(params) {
                scatterPlotMatrix.setContinuousColorScale(params.continuousCsId);
            },

            setCategoricalColorScale: function(params) {
                scatterPlotMatrix.setCategoricalColorScale(params.categoricalCsId);
            },

            setKeptColumns: function(params) {
                scatterPlotMatrix.setKeptColumns(params.keptColumns);
            },

            changeMouseMode: function(params) {
                scatterPlotMatrix.changeMouseMode(params.interactionType);
            },

            setXAxis: function(params) {
                scatterPlotMatrix.setXAxis(params.dim);
            },

            setYAxis: function(params) {
                scatterPlotMatrix.setYAxis(params.dim);
            },

            setZAxis: function(params) {
                scatterPlotMatrix.setZAxis(params.dim);
            },

            getPlotConfig: function(params) {
                if (HTMLWidgets.shinyMode) {
                    const plotConfig = scatterPlotMatrix.getPlotConfig();
                    Shiny.setInputValue(params.configInputId, plotConfig, {priority: "event"});
                }
            },

            resize: function(width, height) {
                scatterPlotMatrix.resize(width, height);
            }
        };
    } // End 'factory'
});
