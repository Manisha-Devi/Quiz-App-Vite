import React from "react";
import PropTypes from "prop-types";
import "./styles/QuestionNavigator.css";

const QuestionNavigator = React.memo(function QuestionNavigator({
  totalQuestions,
  current,
  answers,
  review,
  onJump,
}) {
  const [selectedTypes, setSelectedTypes] = React.useState([]);

  const getStatus = (i) => {
    if (i === current) return "active";
    if (review[i] && answers[i] !== undefined) return "review-answered";
    if (review[i]) return "review";
    if (answers[i] !== undefined) return "answered";
    return "not-visited";
  };

  const countStatus = () => {
    let answered = 0,
      reviewOnly = 0,
      reviewAnswered = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const isAnswered = answers[i] !== undefined;
      const isReviewed = review[i];

      if (isReviewed && isAnswered) reviewAnswered++;
      else if (isReviewed) reviewOnly++;
      else if (isAnswered) answered++;
    }

    const notVisited =
      totalQuestions - (answered + reviewOnly + reviewAnswered);

    return {
      answered,
      reviewOnly,
      reviewAnswered,
      notVisited,
      active: 1,
    };
  };

  const counts = countStatus();

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const filteredIndexes = Array.from(
    { length: totalQuestions },
    (_, i) => i,
  ).filter((i) => {
    const status = getStatus(i);

    // If no checkboxes are selected, show all questions
    if (selectedTypes.length === 0) return true;

    // Show only selected types
    if (selectedTypes.includes("answered") && status === "answered")
      return true;
    if (selectedTypes.includes("review") && status === "review") return true;
    if (
      selectedTypes.includes("review-answered") &&
      status === "review-answered"
    )
      return true;
    if (selectedTypes.includes("not-visited") && status === "not-visited")
      return true;

    return false;
  });

  return (
    <div className="question-navigator">
      <div className="navigator-grid">
        {filteredIndexes.map((i) => (
          <button
            key={i}
            className={`nav-dot ${getStatus(i)}`}
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}`}
            title={`Q${i + 1} - ${getStatus(i).replace("-", " ")}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="legend">


        <label className="legend-pill answered">
          <input
            type="checkbox"
            checked={selectedTypes.includes("answered")}
            onChange={() => handleTypeToggle("answered")}
          />
          Answered ({counts.answered})
        </label>

        <label className="legend-pill review">
          <input
            type="checkbox"
            checked={selectedTypes.includes("review")}
            onChange={() => handleTypeToggle("review")}
          />
          Review ({counts.reviewOnly})
        </label>

        <label className="legend-pill review-answered">
          <input
            type="checkbox"
            checked={selectedTypes.includes("review-answered")}
            onChange={() => handleTypeToggle("review-answered")}
          />
          Review + Answered ({counts.reviewAnswered})
        </label>

        <label className="legend-pill not-visited">
          <input
            type="checkbox"
            checked={selectedTypes.includes("not-visited")}
            onChange={() => handleTypeToggle("not-visited")}
          />
          Not Visited ({counts.notVisited})
        </label>
        <span className="legend-pill current">🎯Current</span>
      </div>
    </div>
  );
});

QuestionNavigator.propTypes = {
  totalQuestions: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  answers: PropTypes.object.isRequired,
  review: PropTypes.object.isRequired,
  onJump: PropTypes.func.isRequired,
};

export default QuestionNavigator;