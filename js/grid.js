var gridMargin = {top: 20, right: 5, bottom: 5, left: 70};
var svgWidth = 1340;  // - gridMargin.left - gridMargin.right;
var svgHeight = 570;  // - gridMargin.top - gridMargin.bottom;

var gridClassSelected = "";
var gridClassHighlightColor = "#33FF33";
var gridClassHighlight = "";
var gridClassPrevColor = "";
var gridColors = {};
var gridColorCounter = 0;
var gridColorsIndex = {};
var isDragging = 0;

var svg;
var container;

// Colors -- changed to only navy for now
var scale = chroma.scale(['#0193e0', '#0193e0']).mode('lab'); //chroma.scale(['navy']); //.mode('lab');

// Start with popover hidden 
$('#po-d3').hide();

var d3Zoom = d3.behavior.zoom()
        .scaleExtent([1, 7])
        .on("zoom", d3Zoomed);

var weekdays = [['Sunday', 'Su'], ['Monday', 'M'], ['Tuesday', 'T'], ['Wednesday', 'W'], ['Thursday', 'Th'], ['Friday', 'F'], ['Saturday', 'Sa']];

function d3Zoomed() {
    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function load_grid(data) {
    var boxWidth = 16; //10
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
    var days = {};

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
    svg = d3.select("#d3").append("svg")
            .attr("width", svgWidth + gridMargin.left + gridMargin.right)
            .attr("height", svgHeight + gridMargin.top + gridMargin.bottom)
            .append("g")
            .attr("transform", "translate(" + gridMargin.left + "," + gridMargin.top + ")");

    // Zoom only works when it is over a rendered item. Render a white background.
    svg.append("rect")
            .attr("x", 0 - gridMargin.left)
            .attr("y", 0 - gridMargin.top)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "#d3d3d3")
            .call(d3Zoom);
    // Enable tooltips
    svg.call(tip);

    container = svg.append("g");
    //svg.on("mousedown.zoom", null);
    svg.on("mousemove.zoom", null);
    svg.on("dblclick.zoom", null);
    svg.on("touchstart.zoom", null);
    //container.on("wheel.zoom", null);
    //container.on("mousewheel.zoom", null);
    //container.on("MozMousePixelScroll.zoom", null);

    // Define drag beavior
    var drag = d3.behavior.drag()
            .on("drag", dragmove)
            .on("dragstart", function (d) {
                d3.selectAll("." + d.class).style("fill", gridClassHighlightColor);
                isDragging = d;
            })
            .on("dragend", function (d) {
                d3.selectAll("." + d.class).style("fill", d.color);
                isDragging = 0;
                console.log("send: " + JSON.stringify(d));
            })
            ;
    function dragmove(d) {
        var x = d3.event.x - d.x - (boxWidth >> 2);
        var y = d3.event.y - d.y - (d.height >> 2);
        ;

        // snap to boxwidth
        if (d3.event.x > (width - boxWidth)) {
            x = Math.round((width - d.x) - boxWidth);
        } else if (x % boxWidth !== 0) {
            if (d.x + x < 0) {
                x = (d.x * -1);
            } else {
                x = (Math.round(x / boxWidth) * boxWidth);
            }
        }

        if (d3.event.y < 0) {
            y = d.y * -1;
        } else if (d3.event.y + d.height > height) {
            y = Math.round((height - d.y) - d.height);
        }

        d3.selectAll("." + d.class).attr("x", function (d) {
            d.x += x;
            return d.x;
        }).attr("y", function (d) {
            d.y += y;
            return d.y;
        }).call(function (d) {
            // Check collide
            //console.log(collide(d));
        });

        //d3.select(this).attr("transform", "translate(" + x + "," + y + ")");
    }

    // loop over data, get room counts
    $.each(data, function (i, val) {
        // Assigns value and gets a final count
        val['class'] = getClassStringId(val.name);
        getCol(val['room']);
        val['cname'] = val['class'].substring(0, val['class'].indexOf("-")); // Used for colors
        setClassColorIndex(val['cname']);

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
        val['col'] = getCol(val.room);
        val['color'] = getGridColor(val['cname']);
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

    $.each(gridColors, function (i, val) {
        classes.push(i);
    });

    classes.sort();

    $.each(classes, function (i, val) {
        $('#addClass').append('<option>' + val + '</option>');
    });

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

    // X
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
            .append("rect")
            .call(drag)
            .on("mousedown.zoom", null);

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
                if (isDragging) {
                    if (d.name === isDragging.name) {
                        //tip.show(d);
                        return;
                    }
                    d3.selectAll("." + d.class).style("fill", '#CC0000');
                } else {
                    d3.selectAll("." + d.class).style("fill", gridClassHighlightColor);
                }
                tip.direction(d.tipDir);
                tip.show(d);
                return;
            })
            .on('mouseout', function (d) {

                if (isDragging) {
                    if (d.name === isDragging.name) {
                        return;
                    }
                }

                tip.hide();
                d3.selectAll("." + d.class).style("fill", d.color);
                return;
            })
            .on("click", function (d, i) {
                d3.event.stopPropagation();
            })
            .on("dblclick", function (d, i) {
                var xOffset = boxWidth * d3Zoom.scale();

                // Find where the div is located on the screen
                var offset = $('#' + 'd3').offset();

                // Get coords, translate them to svg coordinates
                var ctm = this.getCTM();
                var coords = getGridScreenCoords(d.x, d.y, ctm);

                // Height of elements
                var poHeight = $('#po-d3').height();
                var svgHeight = $('#d3').height();

                // Calculate new locations
                //var px = (coords.x + offset.left);
                //var py = (coords.y + offset.top);

                // Offset y value based on where we are on the screen
                var yOffset = (coords.y / svgHeight) * poHeight;

                var final_y = (coords.y + offset.top) - yOffset;
                var final_x = (coords.x + offset.left + xOffset);
                var arrow_y = ((d.height * d3Zoom.scale()) / 2) + yOffset;

                if (final_y < offset.top + 3) {
                    final_y = offset.top + 3;
                }

                if (arrow_y < 15) {
                    arrow_y = 15;
                }

                // ADD CODE HERE TO FLIP WHICH DIRECTION THE POPOVER DISPLAYS ON THE X AXIS
                gridClassSelected = d.name;
                // Set popover title
                $('#po-d3-name').html(d.name);
                $('#po-d3-title').html(d.title);
                $('#po-room').html(d.room);
                $('#po-dtm').html(days[d.name] + ", " + makeTimePretty(d.starttm) + ", " + d.length + " min");

                $('#po-d3').show();

                // Set popover position
                $('#po-d3').css('left', final_x + 'px');
                $('#po-d3').css('top', final_y + 'px');

                // Put arrow in correct spot
                $('#po-d3-arrow').css('top', arrow_y + 'px');

                // Clear constraints
                $('#hConst').html('');
                $('#sConst').html('');

                // Re-populate
                $.each(constraints[gridClassSelected], function (i, val) {
                    $('#' + (val.constType == 'hard' ? "hConst" : "sConst")).append('<option data-value="' + (i - 1) + '">' + val.const + " : " + val.constVal + '</option>');
                });
            });

    function minutesToNumber(minutes) {
        return ((1.666) * minutes) / 100; // 100/60 = 1.666
    }

    function numberToMinutes(n) {
        return ((1.666) / n) * 100; // 100/60 = 1.666
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

    function setClassColorIndex(cname) {
        //var cname = getClassStringId(classname);
        if (!gridColorsIndex[cname]) {
            gridColorsIndex[cname] = gridColorCounter++;
        }
        return gridColorsIndex[cname];
    }

    function collide(element) {
        // Element #1
        var ex1 = element.x;
        var ey1 = element.y;
        var ex2 = ex1 + element.length;
        var ey2 = ey1 + element.height;

        var nx1;
        var ny1;
        var nx2;
        var ny2;

        var result = false;

        //loop
        for (var i = 0; i < data.length; i++) {

            if (data[i].class === element.class) {
                console.log("same class");
                continue;
            }

            // Element #2
            nx1 = data[i].x;
            ny1 = data[i].y;
            nx2 = nx1 + data[i].length;
            ny2 = ny1 + data[i].height;

            // Top corner
            if (
                    checkPoint(ex1, ey1, ex2, ey2, nx1, ny1) ||
                    checkPoint(ex1, ey1, ex2, ey2, nx2, ny1) ||
                    checkPoint(ex1, ey1, ex2, ey2, nx1, ny2) ||
                    checkPoint(ex1, ey1, ex2, ey2, nx2, ny2)
                    ) {
                result = true;
                break;
            }

        }

        return result;
    }

    function checkPoint(ex1, ey1, ex2, ey2, nx, ny) {
        return (nx >= ex1) && (nx <= ex2) && (ny >= ey1) && (ny <= ey2);
    }

    $('#po-d3-ok').click(function (e) {
        // Submit fields via JSON here.

        // This goes in the AJAX success function
        $('#po-d3').hide();

        // update the view based on new data received
        console.log("send: " + JSON.stringify(constraints[gridClassSelected]));

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

        var i = constraints[gridClassSelected].push({"const": addConst, "constVal": addClass, "constType": type});

        // data-value gives us the index of the item to be removed
        $('#' + (type == 'hard' ? "hConst" : "sConst")).append('<option data-value="' + (i - 1) + '">' + addConst + " : " + addClass + '</option>');
    });
}

function getClassStringId(classname) {
    return classname.split(" ").join("_"); //.substring(0, classname.indexOf("-"));
}

function addGridBlocksHl(class_select) {
    removeGridBlocksHl();

    gridClassHighlight = class_select;
    d3.selectAll("." + class_select).style("fill", gridClassHighlightColor);

    gridClassPrevColor = getGridColor(gridClassHighlight.substring(0, gridClassHighlight.indexOf("-")));
}

function removeGridBlocksHl() {
    if (gridClassHighlight != null && $.trim(gridClassHighlight).length > 0) {
        d3.selectAll("." + gridClassHighlight).style("fill", gridClassPrevColor);
    }
}

// The magic function.
function getGridScreenCoords(x, y, ctm) {
    var xn = ctm.e + x * ctm.a;
    var yn = ctm.f + y * ctm.d;
    return {x: xn, y: yn};
}

function getGridColor(cname) {
    if (!gridColors[cname]) {
        gridColors[cname] = scale((gridColorsIndex[cname]) / ((gridColorCounter - 1))).hex();
    }
    return gridColors[cname];
}
