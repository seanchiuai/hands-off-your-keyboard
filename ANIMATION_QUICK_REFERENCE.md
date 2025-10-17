# Animation Quick Reference 🎬

## Most Used Animations

### Entry Animations
```html
<!-- Fade in from bottom -->
<div class="animate-fade-in-up">Content</div>

<!-- Scale in with bounce -->
<div class="animate-scale-in">Content</div>

<!-- Stagger children -->
<div class="stagger-fade-in">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Page load -->
<div class="page-transition">Whole page</div>
```

### Hover Effects
```html
<!-- Lift on hover -->
<div class="hover-lift">Lifts up</div>

<!-- Scale on hover -->
<button class="hover-scale">Grows</button>

<!-- Glow on hover -->
<button class="hover-glow">Glows</button>
```

### Click Feedback
```html
<!-- Press effect -->
<button class="button-press">Click me</button>

<!-- Card entry -->
<div class="card-enter">New card</div>
```

### Continuous Animations
```html
<!-- Float -->
<div class="animate-float">Floats</div>

<!-- Pulse -->
<div class="animate-pulse">Pulses</div>

<!-- Glow -->
<div class="animate-glow">Glows</div>
```

### Loading States
```html
<!-- Dots -->
<div class="loading-dots">
  <span></span>
  <span></span>
  <span></span>
</div>

<!-- Shimmer -->
<div class="animate-shimmer">Loading...</div>
```

### Success Feedback
```html
<!-- Pop in -->
<div class="animate-success-pop">✓</div>

<!-- Wiggle -->
<div class="animate-wiggle">👍</div>
```

## Combo Classes
```html
<!-- Perfect button -->
<button class="button-press hover-lift transition-all-smooth">
  Click me
</button>

<!-- Perfect card -->
<div class="card-enter hover-lift transition-all-smooth">
  Card content
</div>

<!-- Perfect image container -->
<div class="group/image">
  <img class="group-hover/image:scale-110 transition-transform duration-500" />
</div>
```

## Animation Delays
```html
<!-- Delay animation start -->
<div 
  class="animate-fade-in-up" 
  style="animation-delay: 0.3s; animation-fill-mode: backwards;"
>
  Delayed content
</div>
```

## Common Patterns

### Hero Section
```html
<div class="animate-scale-in">
  <div class="animate-float">Logo/Icon</div>
</div>
<div class="stagger-fade-in">
  <h1>Title</h1>
  <p>Subtitle</p>
  <button class="button-press hover-lift">CTA</button>
</div>
```

### List Items
```html
<div class="stagger-fade-in">
  {items.map(item => (
    <div class="hover-lift card-enter">
      {item}
    </div>
  ))}
</div>
```

### Form Inputs
```html
<input class="transition-all-smooth focus:ring-2" />
<button class="button-press hover-lift">Submit</button>
```

### Product Grid
```html
<div class="stagger-fade-in grid grid-cols-3">
  <div class="card-enter hover-lift">Product 1</div>
  <div class="card-enter hover-lift">Product 2</div>
  <div class="card-enter hover-lift">Product 3</div>
</div>
```

## Pro Tips

1. **Always use** `transition-all-smooth` for hover states
2. **Add** `button-press` to ALL buttons
3. **Use** `card-enter` for new cards/modals
4. **Combine** `hover-lift` with other hover effects
5. **Stagger** lists for visual interest
6. **Delay** secondary elements for hierarchy
7. **Test** on mobile for performance
8. **Keep** animations under 1 second
9. **Respect** `prefers-reduced-motion`
10. **Don't** overuse - less is more!

## Performance Checklist

- ✅ Use `transform` instead of `top/left`
- ✅ Use `opacity` instead of `visibility` transitions
- ✅ Add `will-change` only when needed
- ✅ Remove animations for `prefers-reduced-motion`
- ✅ Keep durations reasonable (< 1s)
- ✅ Use `ease-out` for entries
- ✅ Test on slower devices

## Quick Copy-Paste

### Animated Button
```html
<button className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold hover-lift button-press shadow-glow transition-all-smooth">
  Click Me
</button>
```

### Animated Card
```html
<div className="card-elevated rounded-xl p-6 hover-lift transition-all-smooth card-enter">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

### Animated List
```html
<div className="stagger-fade-in space-y-4">
  {items.map(item => (
    <div key={item.id} className="card-simple hover-lift transition-all-smooth">
      {item.content}
    </div>
  ))}
</div>
```

### Animated Page
```html
<div className="page-transition">
  <div className="animate-fade-in-down mb-10">
    <h1>Page Title</h1>
  </div>
  <div className="stagger-fade-in">
    {content}
  </div>
</div>
```

## Remember
- **Entry**: fade-in-up, scale-in, stagger
- **Hover**: hover-lift, hover-scale, hover-glow
- **Click**: button-press
- **Success**: animate-success-pop, animate-wiggle
- **Loading**: loading-dots, animate-shimmer
- **Always**: transition-all-smooth

🎨 **Make it beautiful, make it smooth, make it feel alive!** ✨

