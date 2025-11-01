# Open Graph Image Setup

To use a screenshot of the Player Network visualization as the link preview image:

1. **Take a screenshot:**
   - Run the development server: `npm run dev`
   - Navigate to the Player Network visualization
   - Take a screenshot of the visualization (recommended size: 1200x630px for optimal social media previews)
   - Save it as `public/og-image.png`

2. **Recommended image dimensions:**
   - **Open Graph (Facebook, LinkedIn)**: 1200x630px (ratio 1.91:1)
   - **Twitter**: 1200x675px (ratio 16:9)
   - For best compatibility, use 1200x630px

3. **File location:**
   - Place the image at: `public/og-image.png`
   - This will be served at `/og-image.png` on your deployed site

4. **Testing:**
   - After deploying, test the preview using:
     - [Facebook Debugger](https://developers.facebook.com/tools/debug/)
     - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
     - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

Note: The meta tags are already configured in `index.html`. Once you add the image file and deploy, the link preview will automatically use it.

