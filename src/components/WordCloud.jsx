/**
 * WordCloud.jsx
 *
 * Renders a topic word cloud using d3-cloud layout algorithm.
 *
 * Props:
 *  topics:   Array<{ word: string, weight: number }>
 *  onExport: (canvas: HTMLCanvasElement) => void  — called when PNG export requested
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

// Color palette — muted, sophisticated shades for light background
const WORD_COLORS = [
  '#18181b',
  '#6d28d9',
  '#0369a1',
  '#047857',
  '#b91c1c',
  '#c2410c',
  '#7c3aed',
  '#0e7490',
];

/** Map a topic weight to a font size (px) within the canvas */
function weightToFontSize(weight, minWeight, maxWeight, minPx = 16, maxPx = 72) {
  if (maxWeight === minWeight) return (minPx + maxPx) / 2;
  const t = (weight - minWeight) / (maxWeight - minWeight);
  return Math.round(minPx + Math.pow(t, 0.7) * (maxPx - minPx));
}

export default function WordCloud({ topics, onExport }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const [dimensions, setDimensions]   = useState({ width: 720, height: 440 });
  const [isRendered, setIsRendered]   = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({
        width:  Math.max(width, 280),
        height: Math.min(Math.max(width * 0.6, 280), 520),
      });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!topics?.length || !svgRef.current) return;
    setIsRendered(false);

    const weights = topics.map((t) => t.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);

    const words = topics.map((t, i) => ({
      text:  t.word,
      size:  weightToFontSize(t.weight, minW, maxW),
      color: WORD_COLORS[i % WORD_COLORS.length],
      weight: t.weight,
    }));

    const layout = cloud()
      .size([dimensions.width, dimensions.height])
      .words(words)
      .padding(5)
      .rotate(() => (Math.random() > 0.75 ? 90 : 0))
      .font('DM Sans, sans-serif')
      .fontWeight((d) => (d.weight === Math.max(...weights) ? '700' : '500'))
      .fontSize((d) => d.size)
      .on('end', draw);

    layout.start();

    function draw(computedWords) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .style('background', 'transparent')
        .append('g')
        .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      g.selectAll('text')
        .data(computedWords)
        .enter()
        .append('text')
        .style('font-size', (d) => `${d.size}px`)
        .style('font-family', 'DM Sans, sans-serif')
        .style('font-weight', (d) => (d.weight === maxW ? '700' : '500'))
        .style('fill', (d) => d.color)
        .style('cursor', 'default')
        .style('user-select', 'none')
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .attr('aria-label', (d) => `${d.text} (prominence: ${d.weight})`)
        .text((d) => d.text)
        .on('mouseenter', function () {
          d3.select(this).style('opacity', 0.65);
        })
        .on('mouseleave', function () {
          d3.select(this).style('opacity', 1);
        });

      setIsRendered(true);
    }
  }, [topics, dimensions]);

  const exportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const { width, height } = dimensions;
    const svgData = new XMLSerializer().serializeToString(svg);

    const svgWithStyle = svgData.replace(
      '<svg',
      `<svg xmlns="http://www.w3.org/2000/svg" style="background:#fafafa"`
    );

    const blob = new Blob([svgWithStyle], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale  = 2;
      canvas.width  = width  * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        a.download = 'keynote-word-cloud.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };

    img.src = url;
  }, [dimensions]);

  return (
    <div className="wordcloud-wrap">
      <div ref={containerRef} className="wordcloud-container" aria-label="Word cloud visualization">
        <svg
          ref={svgRef}
          className="wordcloud-svg"
          role="img"
          aria-label={`Word cloud showing: ${topics?.map((t) => t.word).join(', ')}`}
        />
        {!isRendered && (
          <div className="wordcloud-loading" aria-hidden="true">
            <div className="spinner" />
          </div>
        )}
      </div>

      <button
        className="btn btn-secondary btn-sm"
        onClick={exportPng}
        disabled={!isRendered}
        id="btn-download-png"
        aria-label="Download word cloud as PNG image"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PNG
      </button>
    </div>
  );
}
