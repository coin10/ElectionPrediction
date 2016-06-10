USE COIN_ElectionPrediction;

TRUNCATE TABLE UserFollows;

INSERT INTO UserFollows (userId, featureId)
	SELECT
		User.id, FeatureFollowers.featureId
	FROM
		FeatureFollowers, User
	WHERE
		FeatureFollowers.followerId = User.id;