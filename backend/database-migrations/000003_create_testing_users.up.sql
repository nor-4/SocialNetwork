-- Insert 5 users for testing password is 123
INSERT INTO user
    (email, password, first_name, last_name, dob, nickname, about, gender, profile_picture, public)
VALUES
    ('user1@test.dev', '$2a$10$nQz4tpc2mIOkupR.NHWiKORqKOLl9BbjOtw3aUsGq8i5xjHfKGe6G', 'Alice', 'Smith', '1990-05-15', 'Ally', 'Loves hiking and coding.', 1, 101, TRUE),
    ('user2@test.dev', '$2a$10$nQz4tpc2mIOkupR.NHWiKORqKOLl9BbjOtw3aUsGq8i5xjHfKGe6G', 'Bob', 'Johnson', '1985-11-20', 'Bobby', 'Enthusiastic about new technologies and cooking.', 0, 102, TRUE),
    ('user3@test.dev', '$2a$10$nQz4tpc2mIOkupR.NHWiKORqKOLl9BbjOtw3aUsGq8i5xjHfKGe6G', 'Carol', 'Williams', '1995-02-10', 'Jimy', 'A passionate artist and musician.', 1, 0, TRUE),
    ('user4@test.dev', '$2a$10$nQz4tpc2mIOkupR.NHWiKORqKOLl9BbjOtw3aUsGq8i5xjHfKGe6G', 'David', 'Brown', '2000-07-30', 'Dave', 'siomple about', 0, 0, FALSE),
    ('user5@test.dev', '$2a$10$nQz4tpc2mIOkupR.NHWiKORqKOLl9BbjOtw3aUsGq8i5xjHfKGe6G', 'Eve', 'Davis', '1992-09-05', 'DoThat', 'siomple about', 0, 0, TRUE);