$(document).ready(function () {
    var margin = {top: 20, right: 5, bottom: 5, left: 70};
    var svgWidth = 1100;  // - margin.left - margin.right;
    var svgHeight = 570;  // - margin.top - margin.bottom;

    var boxWidth = 14; //10
    var boxHeight = 50.0;
    var daysSkip = 1;
    var numDays = 5; // 7
    var dayBoxes = 0;

    var firstTimeOfDay = 8.00;
    var lastTimeOfDay = 19.00;
    var roomCounter = 0;
    var classes = new Array();
    var constraints = {};
    var rooms = {};
    var colors = {};
    var colorsIndex = {};
    var days = {};
    var colorCounter = 0;

    var selectedName;

    // Colors
    var scale = chroma.scale('RdYlBu').mode('lab');

    // Start with popover hidden 
    $('#po-d3').hide();

    var zoom = d3.behavior.zoom()
            .scaleExtent([1, 7])
            .on("zoom", zoomed);

    var weekdays = [['Sunday', 'Su'], ['Monday', 'M'], ['Tuesday', 'T'], ['Wednesday', 'W'], ['Thursday', 'Th'], ['Friday', 'F'], ['Saturday', 'Sa']];

    function zoomed() {
        container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    var tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
        return "Class: <span style='color:red'>" + d.name
                + "</span></br>Title: <span style='color:red'>" + d.title + "</span>"
                + "</span></br>Room: <span style='color:red'>" + d.room + "</span>"
                + "</span></br>Start: <span style='color:red'>" + d.starttm + "</span>"
                + "</span></br>Length: <span style='color:red'>" + d.length + " min</span>"
                + "</span></br>Day: <span style='color:red'>" + days[d.name] + "</span>"
                ;
    });

    //Make an SVG Container
    var svg = d3.select("#d3").append("svg")
            .attr("width", svgWidth + margin.left + margin.right)
            .attr("height", svgHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

    // Zoom only works when it is over a rendered item. Render a white background.
    svg.append("rect")
            .attr("x", 0 - margin.left)
            .attr("y", 0 - margin.top)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "#d3d3d3");

    // Enable tooltips
    svg.call(tip);

    var container = svg.append("g");

    //container.on("mousedown.zoom", null);
    //container.on("mousemove.zoom", null);
    svg.on("dblclick.zoom", null);
    svg.on("touchstart.zoom", null);
    //container.on("wheel.zoom", null);
    //container.on("mousewheel.zoom", null);
    //container.on("MozMousePixelScroll.zoom", null);

    $.getJSON("classes_filt.json", function (data) {
        // loop over data, get room counts
        $.each(data, function (i, val) {
            // Assigns value and gets a final count
            getCol(val['room']);
            setClassColorIndex(val.name);

            // Set constraints (repeats should not be an issue)
            constraints[val.name] = new Array();

            // Kind of ugly... 
            if (val.day >= 0 && val.day <= 7) {
                if (!days[val.name]) {
                    days[val.name] = weekdays[val.day][1];
                } else {
                    days[val.name] += weekdays[val.day][1];
                }
            }

        });

        dayBoxes = roomCounter;

        // Calculate values so we don't have to do it each time a frame is rendered
        $.each(data, function (i, val) {
            val['class'] = val.name.split(" ").join("_");
            val['col'] = getCol(val.room);
            val['color'] = getColor(val.name);
            val['x'] = (((val.day * dayBoxes) + val['col']) * boxWidth) - (daysSkip * boxWidth * dayBoxes);
            val['y'] = ((timeToNumber(val.starttm) - firstTimeOfDay) * boxHeight);
            val['height'] = (minutesToNumber(val.length) * boxHeight);

            if (val.day == 0) {
                val['tipDir'] = 'w';
            } else if (val.day == 6) {
                val['tipDir'] = 'e';
            } else if ((val['y'] / boxHeight) < 1) {
                val['tipDir'] = 's';
            } else {
                val['tipDir'] = 'n';
            }
        });

        $.each(colors, function (i, val) {
            classes.push(i);
        });

        classes.sort();

        $.each(classes, function (i, val) {
            $('#addClass').append('<option>' + val + '</option>');
        });

        //$('#addClass').html(classes);

        // The +0.1 makes it draw the very last bar. +1 causes a little bit of the axis to hang over
        var width = boxWidth * dayBoxes * numDays + 0.1;
        var height = (lastTimeOfDay - firstTimeOfDay) * boxHeight + 0.1;

        // X bars
        container.append("g")
                .attr("class", "x_axis")
                .selectAll("line")
                .data(d3.range(0, width, boxWidth))
                .enter().append("line")
                .attr("x1", function (d) {
                    return d;
                })
                .attr("y1", 0)
                .attr("x2", function (d) {
                    return d;
                })
                .attr("y2", height)
                .attr("stroke", function (x) {
                    if (x % (boxWidth * dayBoxes) == 0) {
                        return "black";
                    }
                    return "gray";
                })
                .attr("stroke-width", function (x) {
                    if (x % (boxWidth * dayBoxes) == 0) {
                        return 1;
                    }
                    return 0.3;
                });

        // X Labels 

        /*
         var gText = container.selectAll("gText")
         .data(d3.range(0, width, boxWidth * dayBoxes))
         .enter().append("svg:g")
         .attr("y", 0)
         .attr("x", function (d) {
         return d;
         });
         //.attr("transform", function (d, i) {
         //    return "translate(" + (i * boxWidth - boxWidth) + ",0)";
         //});
         gText.append("text")
         .attr("dx", "5px")
         .attr("dy", "-2px")
         .attr("font-size", 14)
         .text(function (d, i) {
         return "Room";
         })
         //.attr("text-anchor", "end")
         //.attr("transform", function (d, i) {
         //    return "translate(20,0) rotate(-90,0,0)";
         //});
         ;
         */
        container.selectAll(".x_axis")
                .data(d3.range(0, width, boxWidth * dayBoxes))
                .enter().append("text")
                .attr("y", 0)
                .attr("x", function (d) {
                    return (d - ((boxWidth * dayBoxes) / 2));
                })
                .attr("font-size", 12)
                .attr("dx", "0em")
                .attr("dy", "-0.5em")
                .attr("text-anchor", "middle")
                //.attr('class', 'name')
                .text(function (d, i) {
                    return weekdays[(i + daysSkip) - 1][0];
                });

        // Y bars
        container.append("g")
                .attr("class", "y_axis")
                .selectAll("line")
                .data(d3.range(0, height, boxHeight))
                .enter().append("line")
                .attr("x1", 0)
                .attr("y1", function (d) {
                    return d;
                })
                .attr("x2", width)
                .attr("y2", function (d) {
                    return d;
                })
                .attr("stroke", "gray")
                .attr("stroke-width", 0.3);

        container.selectAll(".y_axis")
                .data(d3.range(0, height, boxHeight))
                .enter().append("text")
                .attr("x", 0)
                .attr("y", function (d) {
                    return d - (boxHeight) + 3;
                })
                .attr("font-size", 12)
                .style("text-anchor", "end")
                .attr("dx", "-5px")
                .attr("dy", "0em")
                .attr("text-anchor", "middle")
                .text(function (d, i) {
                    var hour = (i - 1) + firstTimeOfDay;
                    if (hour >= 13) {
                        return hour - 12 + ":00pm";
                    }
                    return hour + ":00am";
                });

        // Draw blocks from JSON object
        var blocks = container.selectAll("rect")
                .data(data)
                .enter()
                .append("rect");

        // Set block attributes
        var blockAttributes = blocks
                .attr("class", function (d) {
                    return d.class;
                })
                .attr("x", function (d) {
                    return d.x;
                })
                .attr("y", function (d) {
                    return d.y;
                })
                .attr("width", function (d) {
                    return boxWidth;
                })
                .attr("height", function (d) {
                    return d.height;
                })
                .style("fill", function (d) {
                    return d.color;
                })
                .attr("rx", 4) // set the x corner curve radius
                .attr("ry", 4) // set the y corner curve radius
                .on('mouseover', function (d) {
                    tip.direction(d.tipDir);
                    tip.show(d);
                    d3.selectAll("." + d.class).style("fill", "#2C75FF");
                    return;
                })
                .on('mouseout', function (d) {
                    tip.hide();
                    d3.selectAll("." + d.class).style("fill", d.color);
                    return;
                })
                .on("dblclick", function (d, i) {
                    var xOffset = 10;

                    // Find where the div is located on the screen
                    var offset = $('#' + 'd3').offset();

                    // Get coords, translate them to svg coordinates
                    var ctm = this.getCTM();
                    var coords = getScreenCoords(d.x, d.y, ctm);

                    // Height of elements
                    var poHeight = $('#po-d3').height();
                    var svgHeight = $('#d3').height();

                    // Calculate new locations
                    var px = (coords.x + offset.left);
                    var py = (coords.y + offset.top);

                    // Offset y value based on where we are on the screen
                    var yOffset = (coords.y / svgHeight) * poHeight;

                    // ADD CODE HERE TO FLIP WHICH DIRECTION THE POPOVER DISPLAYS ON THE X AXIS
                    selectedName = d.name;
                    // Set popover title
                    $('#po-d3-name').html(d.name);
                    $('#po-d3-title').html(d.title);
                    $('#po-room').html(d.room);
                    $('#po-dtm').html(days[d.name] + ", " + makeTimePretty(d.starttm) + ", " + d.length + " min");

                    $('#po-d3').show();

                    // Set popover position
                    $('#po-d3').css('left', (coords.x + offset.left + xOffset) + 'px');
                    $('#po-d3').css('top', (coords.y + offset.top) - yOffset + 'px');

                    // Put arrow in correct spot
                    $('#po-d3-arrow').css('top', (d.height / 2) + yOffset + 'px');

                    // Clear constraints
                    $('#hConst').html('');
                    $('#sConst').html('');

                    // Re-populate
                    $.each(constraints[selectedName], function (i, val) {
                        $('#' + (val.constType == 'hard' ? "hConst" : "sConst")).append('<option data-value="' + (i - 1) + '">' + val.const + " : " + val.constVal + '</option>');
                    });
                });
    });

    // The magic function.
    function getScreenCoords(x, y, ctm) {
        var xn = ctm.e + x * ctm.a;
        var yn = ctm.f + y * ctm.d;
        return {x: xn, y: yn};
    }

    function minutesToNumber(minutes) {
        return ((1.666) * minutes) / 100; // 100/60 = 1.666
    }

    function timeToNumber(dtm) {
        var hour = parseFloat(dtm.substring(0, 2));
        var minutes = minutesToNumber(parseFloat(dtm.substring(2)));
        return hour + minutes;
    }

    function makeTimePretty(time) {
        var format = d3.time.format("%H%M");
        var pretty = d3.time.format("%I:%M %p");
        return pretty(format.parse(time));
    }

    function makeDayPretty(day) {
        var format = d3.time.format("%w");
        var pretty = d3.time.format("%a");
        return pretty(format.parse(day));
    }

    function getCol(room) {
        if (!rooms[room]) {
            rooms[room] = roomCounter;
            return roomCounter++;
        }
        return rooms[room];
    }

    function setClassColorIndex(classname) {
        var cname = classname.substring(0, classname.indexOf("-"));
        if (!colorsIndex[cname]) {
            colorsIndex[cname] = colorCounter++;
        }
        return colorsIndex[cname];
    }

    function getColor(classname) {
        var cname = classname.substring(0, classname.indexOf("-"));
        if (!colors[cname]) {
            colors[cname] = scale((colorsIndex[cname]) / ((colorCounter - 1))).hex();
        }
        return colors[cname];
    }

    $('#po-d3-ok').click(function (e) {
        // Submit fields via JSON here.

        // This goes in the AJAX success function
        $('#po-d3').hide();

        // update the view based on new data received
        console.log("send: " + JSON.stringify(constraints[selectedName]));

    });

    // Click close button
    $('#po-d3-close').click(function (e) {
        $('#po-d3').hide();
    });

    // Constraint add button
    $('#po-add').click(function (e) {
        var addConst = $('#addConst').find(":selected").text();
        var addClass = $('#addClass').find(":selected").text();
        var type = 'soft';

        if ($('#hsCb').prop('checked')) {
            type = 'hard';
        }

        var i = constraints[selectedName].push({"const": addConst, "constVal": addClass, "constType": type});

        // data-value gives us the index of the item to be removed
        $('#' + (type == 'hard' ? "hConst" : "sConst")).append('<option data-value="' + (i - 1) + '">' + addConst + " : " + addClass + '</option>');
    });
});