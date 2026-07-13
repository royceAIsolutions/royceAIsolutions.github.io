---
layout: default
title: Royce AI Solutions Blog
---

# Royce AI Solutions Blog

Welcome to the official blog of Royce AI Solutions - AI Receptionists for Auto Dealerships and Medical Practices.

<div style="display: flex; gap: 20px; flex-wrap: wrap;">

<div style="flex: 1; min-width: 300px;">
<h2>📰 Latest Articles</h2>
<ul>
{% assign count = 0 %}
{% for post in site.posts %}
  {% unless post.tags contains "technical-analysis" %}
    {% assign count = count | plus: 1 %}
    <li><a href="{{ post.url }}">{{ post.title }}</a> - {{ post.date | date: "%B %d, %Y" }}</li>
    {% if count >= 9 %}{% break %}{% endif %}
  {% endunless %}
{% endfor %}
</ul>
</div>

<div style="flex: 1; min-width: 300px;">
<h2>📊 Technical Analysis</h2>
<ul>
{% assign count = 0 %}
{% for post in site.posts %}
  {% if post.tags contains "technical-analysis" %}
    {% assign count = count | plus: 1 %}
    <li><a href="{{ post.url }}">{{ post.title }}</a> - {{ date | date: "%B %d, %Y" }}</li>
    {% if count >= 9 %}{% break %}{% endif %}
  {% endif %}
{% endfor %}
</ul>
</div>

</div>

---

## About Royce AI Solutions

We build AI receptionists that never miss a call. Serving auto dealerships, medical practices, dental offices, veterinary clinics, real estate agencies, law firms, insurance agencies, financial services, home services, restaurants, hotels, e-commerce businesses, and ANY business needing 24/7 multilingual call answering in Orange County and beyond.

**Ready to capture every call?**
Visit: [royceai.com](https://royceai.com) | [💬 Live Chat](/chat)


<!-- Floating Chat Button -->
<div style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
  <div style="background: white; padding: 8px 14px; border-radius: 12px; font-size: 0.8em; color: #636e72; box-shadow: 0 2px 10px rgba(0,0,0,0.1); opacity: 0; transition: opacity 0.5s;" id="chatTooltip">💬 Chat with RoyceAI</div>
  <a href="/chat" style="
    width: 60px; height: 60px; border-radius: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; text-decoration: none; display: flex; align-items: center; justify-content: center;
    font-size: 28px; box-shadow: 0 4px 20px rgba(102,126,234,0.4);
    transition: transform 0.2s;
  " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">💬</a>
</div>
<script>setTimeout(()=>{document.getElementById('chatTooltip').style.opacity='1';setTimeout(()=>{document.getElementById('chatTooltip').style.opacity='0'},4000)},2000)</script>