# Intellizzer: Your Intelligent Code Companion 🤖

Welcome to **Intellizzer**, the GitHub Action that transforms your code review process into a seamless and insightful experience! Powered by cutting-edge large language models, Intellizzer goes beyond traditional reviews, offering you a smart assistant that enhances code quality while saving you precious time.

## 🚀 Features That Elevate Your Coding Experience

- **Smart Code Reviews**: Let advanced AI models analyze your pull requests, providing sophisticated insights and recommendations.
- **Constructive Feedback**: Receive tailored comments that help refine your code, making it cleaner and more efficient.
- **Flexible File Filtering**: Easily exclude specific file types from reviews, ensuring your focus remains on the essentials.
- **Multi-Channel Notifications**: Get review insights directly in your GitHub pull requests and via Telegram.
- **Effortless Integration**: Set up Intellizzer in your GitHub workflow with minimal hassle.

## 🔧 Quick Setup

Ready to revolutionize your code reviews? Follow these simple steps:

1. **Prepare Your Credentials**:

   - OpenAI API Key
   - GitHub Token
   - Telegram Bot Token and Chat ID

2. **Store Your Secrets**: Add the following secrets in your GitHub repository settings:

   - `GITHUB_TOKEN`: GitHub authentication token
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `TELEGRAM_BOT_TOKEN`: Telegram bot token
   - `TELEGRAM_CHAT_ID`: Telegram chat ID for notifications

3. **Create Your Workflow File**:
   Create a `.github/workflows/code-review.yml` file:

   ```yaml
   name: Intellizzer Code Reviewer
   on:
     pull_request:
       types: [opened, synchronize]

   jobs:
     review:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: your-org/intellizzer@main
           with:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
             OPENAI_API_MODEL: "gpt-4o" # Optional, defaults to gpt-4o
             TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
             TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
             BOT_NAME: "Code Review Bot" # Optional
             exclude: "*.md,*.txt,package-lock.json,yarn.lock"
   ```

4. **Customize Your Configuration**:
   - Replace `your-org` with your GitHub username or organization
   - Adjust the `exclude` parameter to match your project's needs
   - Optionally specify a different OpenAI model or bot name

## ✨ How Does It Work?

Intellizzer analyzes your pull request changes using advanced language models. It:

- Filters out specified file types
- Sends code snippets to OpenAI's API
- Generates intelligent, constructive review comments
- Optionally sends notifications via Telegram

## 🤝 Contribute to Intellizzer!

We thrive on collaboration! If you have ideas, suggestions, or improvements, we'd love to hear from you. Feel free to submit issues or pull requests.

## 📝 License

This project is proudly licensed under the MIT License. For details, check the [LICENSE](LICENSE) file.
