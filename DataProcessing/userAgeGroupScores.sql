USE COIN_ElectionPrediction;

TRUNCATE TABLE UserAgeGroup;

INSERT INTO UserAgeGroup (userId, ageGroupId, score)
	SELECT
		userId, ageGroupId, SUM(value)
	FROM
		UserFollows, AgeGroupFeatures
	WHERE
		UserFollows.featureId = AgeGroupFeatures.featureId
	GROUP BY
		userId, ageGroupId;