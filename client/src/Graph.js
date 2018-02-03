import React, { Component } from 'react';
import * as d3 from "d3";
import './App.css';

class Graph extends Component {
    constructor(props) {
    super(props);
    this.graphData = this.graphData.bind(this);
  }

  graphData() {
    const w = 1000;
    const h = 500;
    const r = 2;
    const data = this.props.data.filter(d => new Date(d.date).getTime() === new Date(this.props.data[0].date).getTime());
    const dataNest = d3.nest().key(d => d.name).entries(data);

    //div for tooltip
    var div = d3.select("body").append("div") 
      .attr("class", "tooltip")       
      .style("opacity", 0);

    d3.select("svg").remove();

    const svg = d3.select("#Graph").append("svg").attr("width",w).attr("height",h),
                margin = {top: 20, right: 50, bottom: 50, left: 50},
                width = +w - margin.left - margin.right,
                height = +h - margin.top - margin.bottom,
                g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const x = d3.scaleTime().rangeRound([0, width]);
    const y =  d3.scaleLinear().rangeRound([height, 0]);
    const z = d3.scaleOrdinal(d3.schemeCategory20);

    x.domain(d3.extent(data, function(d) { return d.epoch; }));
    y.domain([
      Math.max(0,d3.min(data, function(d) { return d.closePrice; }) - 5), 
      d3.max(data, function(d) { return d.closePrice; }) + 5
      ]);
    z.domain(data.map(d => d.key))

    var priceline = d3.line()
      .x(function(d) { return x(d.epoch); })
      .y(function(d) { return y(d.closePrice); });

    const legendSpace = width/dataNest.length;

    dataNest.forEach(function(d,i) {
      svg.append("path")
        .attr("class","main-line")
        .attr("d", priceline(d.values))
        .style("stroke", z(d.key))
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("text")
          .attr("x", (legendSpace/2)+i*legendSpace)
          .attr("y", height + margin.bottom + 5)
          .style("font", "15px sans-serif")
          .style("fill", function() {
              return d.color = z(d.key); })
          .text("--" + d.key); 
    })

    svg.selectAll("line")
      .data(data)
      .enter()
      .append("line")
      .attr("class","line")
      .attr("x1", (d) => x(d.epoch) + margin.left)
      .attr("x2", (d) => x(d.epoch) + margin.left)
      .attr("y1", h - margin.bottom)
      .attr("y2", margin.top)
      .attr("stroke-width","3")
      .attr("stroke","transparent")

    svg.selectAll("cirlce")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.epoch))
      .attr("cy", (d) => y(d.closePrice))
      .attr("r", r)
      .style("fill", (d) => z(d.name))
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .on("mouseover", function(d) {    
        div.transition()    
          .duration(200)    
          .style("opacity", .9);  
        div.html("Name: " + d.name + "<br/>Date: " + d.date + "<br/>Time: " + d.time + "<br/>Open: " + 
            d.openPrice + "<br/>Close: " + d.closePrice + "<br/>High: " + d.highPrice+ "<br/>Low: " + 
            d.lowPrice + "<br/>Volume: " + d.volume)
          .style("left", (d3.event.pageX) + "px")   
          .style("top", (d3.event.pageY) + "px");  
      })          
      .on("mouseout", function(d) {   
        div.transition()    
          .duration(100)    
          .style("opacity", 0); 
      });;

    g.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("x", -((h / 2)) + margin.top)
      .attr("y", -30)
      .style("font", "15px sans-serif")
      .text("Price ($)");
  }

  render() {
    return (
      <div className="Graph">
        <div id="Graph">
        {(this.props.data) ? this.graphData() : <div>Loading stocks...</div>}
        </div>
      </div>
    );
  }
}

export default Graph;