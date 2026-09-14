/**
 * WordCloud.jsx
 *
 * Renders a topic word cloud using d3-cloud layout algorithm.
 *
 * Props:
 *  topics: Array<{ word: string, weight: number }>
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

// Color palette — vibrant, high-contrast shades for dark/light themes
const WORD_COLORS = [
  '#a855f7', // Purple
  '#38bdf8', // Sky
  '#f43f5e', // Rose
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#818cf8', // Indigo
  '#c084fc', // Violet
  '#2dd4bf', // Teal
];

/** Map a topic weight to a font size (px) within the canvas */
function weightToFontSize(weight, minWeight, maxWeight, minPx = 18, maxPx = 76) {
  if (maxWeight === minWeight) return (minPx + maxPx) / 2;
  const t = (weight - minWeight) / (maxWeight - minWeight);
  return Math.round(minPx + Math.pow(t, 0.7) * (maxPx - minPx));
}

export default function WordCloud({ topics }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const [dimensions, setDimensions]   = useState({ width: 720, height: 440 });
  const [isRendered, setIsRendered]   = useState(false);
  const [downloaded, setDownloaded]   = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({
        width:  Math.max(width, 280),
        height: Math.min(Math.max(width * 0.6, 280), 500),
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
      text:   t.word,
      size:   weightToFontSize(t.weight, minW, maxW),
      color:  WORD_COLORS[i % WORD_COLORS.length],
      weight: t.weight,
    }));

    const layout = cloud()
      .size([dimensions.width, dimensions.height])
      .words(words)
      .padding(6)
      .rotate(() => (Math.random() > 0.8 ? 90 : 0))
      .font('system-ui, -apple-system, sans-serif')
      .fontWeight((d) => (d.weight === maxW ? '700' : '600'))
      .fontSize((d) => d.size)
      .on('end', draw);

    layout.start();

    function draw(computedWords) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
        .style('background', 'transparent')
        .append('g')
        .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      g.selectAll('text')
        .data(computedWords)
        .enter()
        .append('text')
        .style('font-size', (d) => `${d.size}px`)
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('font-weight', (d) => (d.weight === maxW ? '700' : '600'))
        .style('fill', (d) => d.color)
        .style('cursor', 'default')
        .style('user-select', 'none')
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .attr('aria-label', (d) => `${d.text} (prominence: ${d.weight})`)
        .text((d) => d.text)
        .on('mouseenter', function () {
          d3.select(this).style('opacity', 0.7);
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

    // Clone SVG element to prepare clean export
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);

    // Add background color for PNG export
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#121212');
    clone.insertBefore(bgRect, clone.firstChild);

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // High-res retina scale
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `keynote-word-cloud-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      } catch (err) {
        console.error('PNG export failed:', err);
      }
    };

    img.src = svgBase64;
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
        {downloaded ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Downloaded PNG!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </>
        )}
      </button>
    </div>
  );
}
