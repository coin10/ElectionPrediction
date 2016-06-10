USE COIN_ElectionPrediction;

UPDATE User as U LEFT JOIN (SELECT UAG.userId, UAG.ageGroupId FROM UserAgeGroup as UAG INNER JOIN (SELECT UserAgeGroup.userId, MAX(UserAgeGroup.score) as maxScore FROM UserAgeGroup GROUP BY UserAgeGroup.userId) AS groupedMax ON UAG.userId = groupedMax.userId AND UAG.score = groupedMax.maxScore) AS AgeGroup ON U.id = AgeGroup.userId SET U.ageGroupId = AgeGroup.ageGroupId;
