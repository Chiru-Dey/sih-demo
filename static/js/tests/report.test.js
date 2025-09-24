const puppeteer = require('puppeteer');
const path = require('path');

describe('Disaster Report Form Media Upload Tests', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--window-size=1280,720']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
    });

    beforeEach(async () => {
        await page.goto('http://localhost:5000/report');
    });

    afterAll(async () => {
        await browser.close();
    });

    test('Core file upload functionality', async () => {
        // Setup file paths for different media types
        const imagePath = path.join(__dirname, '../test-files/test-image.jpg');
        const videoPath = path.join(__dirname, '../test-files/test-video.mp4');
        const audioPath = path.join(__dirname, '../test-files/test-audio.mp3');

        // Get the file input element
        const fileInput = await page.$('#media');
        
        // Upload image
        await fileInput.uploadFile(imagePath);
        await page.waitForSelector('.preview-item.image');
        const imagePreview = await page.$('.preview-item.image img');
        expect(imagePreview).toBeTruthy();

        // Upload video
        await fileInput.uploadFile(videoPath);
        await page.waitForSelector('.preview-item.video');
        const videoPreview = await page.$('.preview-item.video video');
        expect(videoPreview).toBeTruthy();

        // Upload audio
        await fileInput.uploadFile(audioPath);
        await page.waitForSelector('.preview-item.audio');
        const audioIcon = await page.$('.preview-item.audio i.fa-music');
        expect(audioIcon).toBeTruthy();

        // Test remove functionality
        const removeBtns = await page.$$('.remove-btn');
        await removeBtns[0].click();
        const remainingPreviews = await page.$$('.preview-item');
        expect(remainingPreviews.length).toBe(2);
    });

    test('Upload button interaction', async () => {
        // Test hover effect on upload button
        const uploadBtn = await page.$('.media-upload-btn');
        await uploadBtn.hover();
        
        const btnColor = await page.evaluate(btn => {
            return window.getComputedStyle(btn).color;
        }, uploadBtn);
        
        expect(btnColor).toMatch(/rgb\(89, 120, 243\)/); // Accent color
    });

    test('File size validation', async () => {
        // Create a large file that exceeds the 50MB limit
        const largePath = path.join(__dirname, '../test-files/large-file.jpg');
        
        // Get the file input element
        const fileInput = await page.$('#media');
        
        // Try to upload large file
        await fileInput.uploadFile(largePath);
        
        // Wait for error notification
        await page.waitForSelector('.notification.error');
        
        const errorText = await page.$eval('.notification.error', el => el.textContent);
        expect(errorText).toContain('File too large');
    });
});