
import React, { useState } from 'react';
import './styles/QuestionProcessor.css';

const QuestionProcessor = () => {
  const [questions, setQuestions] = useState([{
    id: 1,
    question: '',
    options: ['', '', '', ''],
    answer: 0,
    level: 0,
    explanation: ''
  }]);
  
  const [fileName, setFileName] = useState('time_and_work');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    const newQuestion = {
      id: questions.length + 1,
      question: '',
      options: ['', '', '', ''],
      answer: 0,
      level: 0,
      explanation: ''
    };
    setQuestions([...questions, newQuestion]);
    setCurrentQuestionIndex(questions.length);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      // Renumber questions
      const renumberedQuestions = updatedQuestions.map((q, i) => ({ ...q, id: i + 1 }));
      setQuestions(renumberedQuestions);
      setCurrentQuestionIndex(Math.max(0, index - 1));
    }
  };

  const formatQuestionWithKaTeX = (text) => {
    // Convert common mathematical expressions to KaTeX format
    return text
      .replace(/\b(\d+\/\d+)\b/g, '$$\\frac{$1}$$')
      .replace(/\b(\d+)\^(\d+)\b/g, '$$^{$2}$$')
      .replace(/sqrt\(([^)]+)\)/g, '$$\\sqrt{$1}$$')
      .replace(/\b(\d+)%\b/g, '$1\\%')
      .replace(/\b(sin|cos|tan|log)\(([^)]+)\)/g, '$$\\$1($2)$$');
  };

  const autoFormatQuestion = (index) => {
    const question = questions[index];
    const formattedQuestion = formatQuestionWithKaTeX(question.question);
    const formattedOptions = question.options.map(option => formatQuestionWithKaTeX(option));
    
    updateQuestion(index, 'question', formattedQuestion);
    formattedOptions.forEach((option, optionIndex) => {
      updateOption(index, optionIndex, option);
    });
  };

  const generateJSON = () => {
    const jsonData = questions.filter(q => q.question.trim() !== '');
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromText = (text) => {
    // Parse text format questions
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const parsedQuestions = [];
    let currentQuestion = null;
    let questionCounter = 1;

    lines.forEach(line => {
      line = line.trim();
      
      // Check if it's a question (starts with number or "Q")
      if (/^\d+\.|\bQ\d+|\bQuestion/.test(line)) {
        if (currentQuestion) {
          parsedQuestions.push(currentQuestion);
        }
        currentQuestion = {
          id: questionCounter++,
          question: line.replace(/^\d+\.|\bQ\d+[:\.]?|\bQuestion\s*\d*[:\.]?/i, '').trim(),
          options: [],
          answer: 0,
          level: 0,
          explanation: ''
        };
      }
      // Check if it's an option (starts with A, B, C, D or a), b), c), d))
      else if (/^[A-D][\.\)]|^[a-d][\.\)]/i.test(line) && currentQuestion) {
        const option = line.replace(/^[A-Da-d][\.\)]\s*/i, '').trim();
        currentQuestion.options.push(option);
      }
      // Check if it's an answer line
      else if (/answer|correct|ans/i.test(line) && currentQuestion) {
        const answerMatch = line.match(/[A-D]|[a-d]|\d+/i);
        if (answerMatch) {
          const answerChar = answerMatch[0].toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(answerChar)) {
            currentQuestion.answer = answerChar.charCodeAt(0) - 65;
          } else if (/\d+/.test(answerMatch[0])) {
            currentQuestion.answer = parseInt(answerMatch[0]) - 1;
          }
        }
      }
    });

    if (currentQuestion) {
      parsedQuestions.push(currentQuestion);
    }

    // Fill missing options with empty strings
    parsedQuestions.forEach(q => {
      while (q.options.length < 4) {
        q.options.push('');
      }
    });

    if (parsedQuestions.length > 0) {
      setQuestions(parsedQuestions);
      setCurrentQuestionIndex(0);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="question-processor">
      <div className="processor-header">
        <h2>Question Processor Tool</h2>
        <div className="file-controls">
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="File name"
            className="file-name-input"
          />
          <button onClick={generateJSON} className="generate-btn">
            Generate JSON
          </button>
        </div>
      </div>

      <div className="import-section">
        <h3>Import Questions from Text</h3>
        <textarea
          placeholder="Paste your questions here... Format:
1. Question text?
A) Option 1
B) Option 2
C) Option 3
D) Option 4
Answer: A"
          className="import-textarea"
          onChange={(e) => {
            if (e.target.value.trim()) {
              importFromText(e.target.value);
            }
          }}
        />
      </div>

      <div className="question-navigation">
        <button
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </button>
        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
        <button
          onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
          disabled={currentQuestionIndex === questions.length - 1}
        >
          Next
        </button>
        <button onClick={addQuestion} className="add-question-btn">
          Add Question
        </button>
      </div>

      <div className="question-editor">
        <div className="question-header">
          <h3>Question {currentQuestion.id}</h3>
          <div className="question-controls">
            <button
              onClick={() => autoFormatQuestion(currentQuestionIndex)}
              className="format-btn"
            >
              Auto Format KaTeX
            </button>
            <button
              onClick={() => removeQuestion(currentQuestionIndex)}
              className="remove-btn"
              disabled={questions.length === 1}
            >
              Remove
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Question Text:</label>
          <textarea
            value={currentQuestion.question}
            onChange={(e) => updateQuestion(currentQuestionIndex, 'question', e.target.value)}
            placeholder="Enter question text here..."
            rows="3"
          />
        </div>

        <div className="options-section">
          <label>Options:</label>
          {currentQuestion.options.map((option, index) => (
            <div key={index} className="option-row">
              <span className="option-label">{String.fromCharCode(65 + index)})</span>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(currentQuestionIndex, index, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
              />
              <input
                type="radio"
                name={`answer-${currentQuestionIndex}`}
                checked={currentQuestion.answer === index}
                onChange={() => updateQuestion(currentQuestionIndex, 'answer', index)}
              />
            </div>
          ))}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Difficulty Level:</label>
            <select
              value={currentQuestion.level}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'level', parseInt(e.target.value))}
            >
              <option value={0}>Easy</option>
              <option value={1}>Medium</option>
              <option value={2}>Hard</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Explanation:</label>
          <textarea
            value={currentQuestion.explanation}
            onChange={(e) => updateQuestion(currentQuestionIndex, 'explanation', e.target.value)}
            placeholder="Enter explanation here..."
            rows="3"
          />
        </div>
      </div>

      <div className="preview-section">
        <h3>JSON Preview</h3>
        <pre className="json-preview">
          {JSON.stringify(questions.filter(q => q.question.trim() !== ''), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default QuestionProcessor;
